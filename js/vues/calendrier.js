import { PLAGE_MAX, SIGNIFICATIONS, SIGNIFICATION_VIDE, STATUTS } from '../config/seuils.js';
import { agregerParJour } from '../domaine/agregation.js';
import {
  dateDepuisISO,
  dateLocaleISO,
  joursDePlage,
  nombreDeJours,
  plageDerniersJours,
} from '../domaine/dates.js';
import { couleur, scoreJour } from '../domaine/scoring.js';
import { lireVersions } from '../services/objectifs.js';
import { lireRepasDePlage } from '../services/repas.js';
import { ETATS, lireEtat } from '../services/supabase.js';
import {
  effacerErreurs,
  messageErreurSupabase,
  signalerErreurs,
} from './formulaire.js';

const PLAGE_PAR_DEFAUT = 30;
const CHAMPS_PLAGE = ['plageDebut', 'plageFin'];

const LIBELLES_METRIQUE = {
  global: 'global',
  calories: 'calories',
  proteines: 'protéines',
  glucides: 'glucides',
  lipides: 'lipides',
};

const titre = document.getElementById('titre-grille');
const etat = document.getElementById('etat-calendrier');
const grille = document.getElementById('grille-calendrier');
const legende = document.getElementById('legende-calendrier');
const formFiltres = document.getElementById('formulaire-filtres');

// Plage affichée : « N derniers jours » (recalculée à chaque affichage, la date du jour ayant pu changer)
// ou plage personnalisée fixe.
let nombreJours = PLAGE_PAR_DEFAUT;
let plagePersonnalisee = null;
let metrique = 'global';
let jours = [];
let chargementEnCours = 0;

const formatJourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const formatMoisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const formatPeriode = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function afficherEtat(texte) {
  etat.textContent = texte;
  etat.hidden = !texte;
}

// Couleur et libellé d'un jour pour la métrique active.
function statutDuJour(jour) {
  if (!jour.totaux) return { couleur: 'vide', libelle: STATUTS.vide };
  if (jour.sansObjectif) return { couleur: 'vide', libelle: 'Sans objectif' };
  const score = scoreJour(jour.totaux, jour.objectifs);
  const teinte = couleur(score?.[metrique]?.ecart ?? null);
  return { couleur: teinte, libelle: STATUTS[teinte] };
}

function creerCase(jour, estPremiere, cleAujourdhui) {
  const { couleur: teinte, libelle } = statutDuJour(jour);
  const cellule = document.createElement('li');
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = `calendrier__case calendrier__case--${teinte}`;
  if (jour.cle === cleAujourdhui) {
    bouton.classList.add('calendrier__case--aujourdhui');
    bouton.setAttribute('aria-current', 'date');
  }
  bouton.dataset.jour = jour.cle;
  bouton.setAttribute('aria-label', `${formatJourMois.format(jour.date)}, ${LIBELLES_METRIQUE[metrique]} : ${libelle}`);

  if (estPremiere || jour.date.getDate() === 1) {
    const mois = document.createElement('span');
    mois.className = 'calendrier__mois';
    mois.setAttribute('aria-hidden', 'true');
    mois.textContent = formatMoisCourt.format(jour.date);
    bouton.append(mois);
  }
  const numero = document.createElement('span');
  numero.className = 'calendrier__numero';
  numero.setAttribute('aria-hidden', 'true');
  numero.textContent = String(jour.date.getDate());
  bouton.append(numero);

  cellule.append(bouton);
  return cellule;
}

// Grille de 7 colonnes du lundi au dimanche : cases d'alignement neutres avant le premier jour.
function dessinerGrille() {
  const cleAujourdhui = dateLocaleISO();
  const decalage = jours.length > 0 ? (jours[0].date.getDay() + 6) % 7 : 0;
  const alignements = Array.from({ length: decalage }, () => {
    const cellule = document.createElement('li');
    cellule.className = 'calendrier__alignement';
    cellule.setAttribute('aria-hidden', 'true');
    return cellule;
  });
  const cases = jours.map((jour, i) => creerCase(jour, i === 0, cleAujourdhui));
  grille.replaceChildren(...alignements, ...cases);
}

// Une ligne par couleur, avec sa signification pour la métrique active.
function dessinerLegende() {
  const lignes = ['vert', 'orange', 'rouge', 'vide'].map((teinte) => {
    const ligne = document.createElement('li');
    ligne.className = 'legende__ligne';
    const pastille = document.createElement('span');
    pastille.className = `pastille pastille--${teinte}`;
    pastille.setAttribute('aria-hidden', 'true');
    const libelle = document.createElement('strong');
    libelle.textContent = STATUTS[teinte];
    const signification = teinte === 'vide' ? SIGNIFICATION_VIDE : SIGNIFICATIONS[metrique][teinte];
    const texte = document.createElement('span');
    texte.append(libelle, ` : ${signification}`);
    ligne.append(pastille, texte);
    return ligne;
  });
  legende.replaceChildren(...lignes);
}

function plageCourante() {
  return plagePersonnalisee ?? plageDerniersJours(nombreJours);
}

function afficherPeriode(plage) {
  titre.textContent = `Du ${formatPeriode.format(plage.debut)} au ${formatPeriode.format(plage.fin)}`;
}

// Charge repas et objectifs de la plage puis redessine la grille. En cas d'échec, la grille précédente reste affichée.
async function charger() {
  const plage = plageCourante();

  if (lireEtat() !== ETATS.connecte) {
    afficherPeriode(plage);
    jours = [];
    grille.replaceChildren();
    afficherEtat('Connexion requise pour afficher le calendrier : renseigner Réglages → Connexion.');
    return;
  }

  const numero = ++chargementEnCours;
  grille.setAttribute('aria-busy', 'true');
  afficherEtat('Chargement…');
  try {
    const [repas, versions] = await Promise.all([lireRepasDePlage(plage), lireVersions()]);
    if (numero !== chargementEnCours) return;
    jours = agregerParJour(repas, versions, joursDePlage(plage));
    afficherPeriode(plage);
    afficherEtat('');
    dessinerGrille();
  } catch (erreur) {
    if (numero !== chargementEnCours) return;
    afficherEtat(messageErreurSupabase(erreur, 'Chargement du calendrier', 'repas'));
  } finally {
    if (numero === chargementEnCours) grille.removeAttribute('aria-busy');
  }
}

// Recharge à chaque affichage de l'onglet : des repas ont pu être saisis entre-temps.
export function afficherCalendrier() {
  charger();
}

function remplirChampsPlage() {
  const { debut, fin } = plageCourante();
  formFiltres.elements.plageDebut.value = dateLocaleISO(debut);
  formFiltres.elements.plageFin.value = dateLocaleISO(fin);
}

function surChoixPlage(value) {
  effacerErreurs(formFiltres, CHAMPS_PLAGE);
  if (value === 'personnalisee') {
    remplirChampsPlage();
    return;
  }
  nombreJours = Number(value);
  plagePersonnalisee = null;
  charger();
}

function validerPlage(debut, fin) {
  const erreurs = {};
  if (!debut) erreurs.plageDebut = 'Saisir la date de début.';
  if (!fin) erreurs.plageFin = 'Saisir la date de fin.';
  if (debut && fin) {
    if (debut > fin) {
      erreurs.plageFin = 'La date de fin doit être identique ou postérieure à la date de début.';
    } else if (nombreDeJours({ debut, fin }) > PLAGE_MAX) {
      erreurs.plageFin = `Période trop longue (${nombreDeJours({ debut, fin })} jours) : ${PLAGE_MAX} jours maximum.`;
    }
  }
  return erreurs;
}

// Une plage personnalisée valide est appliquée dès qu'une des deux dates change.
function appliquerPlagePersonnalisee() {
  effacerErreurs(formFiltres, CHAMPS_PLAGE);
  const debut = dateDepuisISO(formFiltres.elements.plageDebut.value);
  const fin = dateDepuisISO(formFiltres.elements.plageFin.value);
  if (signalerErreurs(formFiltres, CHAMPS_PLAGE, validerPlage(debut, fin))) return;
  plagePersonnalisee = { debut, fin };
  charger();
}

// Changer de métrique recolore la grille sans nouvelle requête.
function surChoixMetrique(value) {
  metrique = value;
  dessinerGrille();
  dessinerLegende();
}

export function initialiserCalendrier() {
  formFiltres.addEventListener('change', ({ target }) => {
    if (target.name === 'plage') surChoixPlage(target.value);
    else if (target.name === 'metrique') surChoixMetrique(target.value);
    else if (CHAMPS_PLAGE.includes(target.name)) appliquerPlagePersonnalisee();
  });
  formFiltres.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    appliquerPlagePersonnalisee();
  });
  afficherPeriode(plageCourante());
  dessinerLegende();
}
