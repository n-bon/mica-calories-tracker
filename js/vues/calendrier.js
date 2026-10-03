import { STATUTS } from '../config/seuils.js';
import { agregerParJour } from '../domaine/agregation.js';
import { dateLocaleISO, joursDePlage, plageDerniersJours } from '../domaine/dates.js';
import { couleur, scoreJour } from '../domaine/scoring.js';
import { lireVersions } from '../services/objectifs.js';
import { lireRepasDePlage } from '../services/repas.js';
import { ETATS, lireEtat } from '../services/supabase.js';
import { messageErreurSupabase } from './formulaire.js';

const PLAGE_PAR_DEFAUT = 30;

const LIBELLES_METRIQUE = {
  global: 'global',
  calories: 'calories',
  proteines: 'protéines',
  glucides: 'glucides',
  lipides: 'lipides',
};

const titre = document.getElementById('titre-grille');
const sousTitre = document.getElementById('periode-grille');
const etat = document.getElementById('etat-calendrier');
const grille = document.getElementById('grille-calendrier');

const nombreJours = PLAGE_PAR_DEFAUT;
const metrique = 'global';
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

function afficherPeriode(plage) {
  titre.textContent = `${nombreJours} derniers jours`;
  sousTitre.textContent = `Du ${formatPeriode.format(plage.debut)} au ${formatPeriode.format(plage.fin)}`;
}

// Recharge repas et objectifs de la plage à chaque affichage de l'onglet (les saisies ont pu changer).
export async function afficherCalendrier() {
  const plage = plageDerniersJours(nombreJours);
  afficherPeriode(plage);

  if (lireEtat() !== ETATS.connecte) {
    jours = [];
    grille.replaceChildren();
    afficherEtat('Connexion requise pour afficher le calendrier : renseigner Réglages → Connexion.');
    return;
  }

  const numero = ++chargementEnCours;
  grille.setAttribute('aria-busy', 'true');
  if (jours.length === 0) afficherEtat('Chargement…');
  try {
    const [repas, versions] = await Promise.all([lireRepasDePlage(plage), lireVersions()]);
    if (numero !== chargementEnCours) return;
    jours = agregerParJour(repas, versions, joursDePlage(plage));
    afficherEtat('');
    dessinerGrille();
  } catch (erreur) {
    if (numero !== chargementEnCours) return;
    afficherEtat(messageErreurSupabase(erreur, 'Chargement du calendrier', 'repas'));
  } finally {
    if (numero === chargementEnCours) grille.removeAttribute('aria-busy');
  }
}
