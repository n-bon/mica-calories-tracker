import { METRIQUES } from '../config/seuils.js';
import { grouperParJour } from '../domaine/agregation.js';
import { generationRepas, lirePageRepas } from '../services/repas.js';
import { ETATS, lireEtat, surChangementEtat } from '../services/supabase.js';
import { formaterNombre } from '../utils/nombres.js';
import { messageErreurSupabase } from './formulaire.js';

const JOURS_PAR_AFFICHAGE = 100;
const TAILLE_PAGE = 500;

const etat = document.getElementById('historique-etat');
const tableau = document.getElementById('historique-tableau');
const boutonPlus = document.getElementById('historique-plus');

const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
// Années passées : date numérique, aussi étroite que « sam. 3 oct. » pour tenir à 375 px.
const formatJourAnnee = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

let repasCharges = [];
let finAtteinte = false;
let nombreJours = JOURS_PAR_AFFICHAGE;
let generationAffichee = null;
let numeroChargement = 0;

function afficherEtat(texte) {
  etat.textContent = texte;
  etat.hidden = !texte;
}

// Le contenu est enveloppé pour pouvoir replier une ligne sans la retirer du calcul des largeurs de colonnes.
function cellule(balise, texte) {
  const element = document.createElement(balise);
  const contenu = document.createElement('span');
  contenu.className = 'historique__contenu';
  contenu.textContent = texte;
  element.append(contenu);
  return element;
}

function cellulesMetriques(ligne, valeurs) {
  METRIQUES.forEach((metrique) => {
    ligne.append(cellule('td', formaterNombre(Number(valeurs[metrique]), 1)));
  });
}

// Un <tbody> par jour : la ligne du jour (totaux) puis les lignes de ses repas, repliées par défaut.
function creerJour(jour, anneeCourante) {
  const groupe = document.createElement('tbody');

  const ligneJour = document.createElement('tr');
  ligneJour.className = 'historique__ligne-jour';
  const entete = document.createElement('th');
  entete.scope = 'row';
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'historique__jour';
  bouton.setAttribute('aria-expanded', 'false');
  bouton.setAttribute('aria-controls', jour.repas.map((_, i) => `historique-${jour.cle}-${i}`).join(' '));
  const format = jour.date.getFullYear() === anneeCourante ? formatJour : formatJourAnnee;
  bouton.textContent = format.format(jour.date);
  entete.append(bouton);
  ligneJour.append(entete);
  cellulesMetriques(ligneJour, jour.totaux);
  groupe.append(ligneJour);

  [...jour.repas].reverse().forEach((repas, i) => {
    const ligne = document.createElement('tr');
    ligne.className = 'historique__ligne-repas historique__ligne-repas--repliee';
    ligne.setAttribute('aria-hidden', 'true');
    ligne.id = `historique-${jour.cle}-${i}`;
    const libelle = cellule('th', `${formatHeure.format(new Date(repas.pris_le))} ${repas.nom}`);
    libelle.scope = 'row';
    ligne.append(libelle);
    cellulesMetriques(ligne, repas);
    groupe.append(ligne);
  });
  return groupe;
}

function dessiner() {
  const jours = grouperParJour(repasCharges);
  const anneeCourante = new Date().getFullYear();
  tableau.querySelectorAll('tbody').forEach((groupe) => groupe.remove());
  tableau.append(...jours.slice(0, nombreJours).map((jour) => creerJour(jour, anneeCourante)));
  tableau.hidden = jours.length === 0;
  boutonPlus.hidden = jours.length <= nombreJours && finAtteinte;
  afficherEtat(jours.length === 0 ? 'Aucun repas saisi.' : '');
}

// Lit des pages de repas jusqu'à disposer d'un jour de plus que nécessaire : le dernier jour affiché
// est alors complet, même s'il était coupé entre deux pages.
async function chargerJusqua(nombre, numero) {
  while (!finAtteinte && grouperParJour(repasCharges).length <= nombre) {
    const page = await lirePageRepas(repasCharges.length, TAILLE_PAGE);
    if (numero !== numeroChargement) return false;
    repasCharges.push(...page);
    finAtteinte = page.length < TAILLE_PAGE;
  }
  return true;
}

async function recharger() {
  const numero = ++numeroChargement;
  repasCharges = [];
  finAtteinte = false;
  nombreJours = JOURS_PAR_AFFICHAGE;
  generationAffichee = generationRepas();
  boutonPlus.hidden = true;
  afficherEtat('Chargement…');
  try {
    if (await chargerJusqua(nombreJours, numero)) dessiner();
  } catch (erreur) {
    if (numero !== numeroChargement) return;
    generationAffichee = null;
    tableau.hidden = true;
    afficherEtat(messageErreurSupabase(erreur, 'Chargement de l’historique', 'repas'));
  }
}

async function afficherPlus() {
  const numero = numeroChargement;
  boutonPlus.disabled = true;
  boutonPlus.textContent = 'Chargement…';
  try {
    if (await chargerJusqua(nombreJours + JOURS_PAR_AFFICHAGE, numero)) {
      nombreJours += JOURS_PAR_AFFICHAGE;
      dessiner();
    }
  } catch (erreur) {
    afficherEtat(messageErreurSupabase(erreur, 'Chargement de l’historique', 'repas'));
  } finally {
    boutonPlus.disabled = false;
    boutonPlus.textContent = 'Afficher plus';
  }
}

function basculerJour(groupe) {
  const bouton = groupe.querySelector('.historique__jour');
  const ouvert = bouton.getAttribute('aria-expanded') === 'true';
  bouton.setAttribute('aria-expanded', String(!ouvert));
  groupe.querySelectorAll('.historique__ligne-repas').forEach((ligne) => {
    ligne.classList.toggle('historique__ligne-repas--repliee', ouvert);
    ligne.setAttribute('aria-hidden', String(ouvert));
  });
}

// Recharge depuis le début seulement si des repas ont changé depuis le dernier affichage.
export function afficherHistorique() {
  if (lireEtat() !== ETATS.connecte) {
    generationAffichee = null;
    repasCharges = [];
    tableau.hidden = true;
    boutonPlus.hidden = true;
    afficherEtat('Connexion requise : renseigner Réglages → Connexion.');
    return;
  }
  if (generationAffichee !== generationRepas()) recharger();
}

export function initialiserHistorique() {
  tableau.addEventListener('click', ({ target }) => {
    const ligne = target.closest('.historique__ligne-jour');
    if (ligne) basculerJour(ligne.parentElement);
  });
  boutonPlus.addEventListener('click', afficherPlus);
  surChangementEtat(() => {
    generationAffichee = null;
  });
}
