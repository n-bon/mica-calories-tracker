import { TYPES_REPAS } from '../config/defauts.js';
import { METRIQUES } from '../config/seuils.js';
import { scoreJour, statutDuJour } from '../domaine/scoring.js';
import { formaterMacros, formaterNombre } from '../utils/nombres.js';

const LIBELLES = {
  calories: { nom: 'Calories', unite: 'kcal' },
  proteines: { nom: 'Protéines', unite: 'g' },
  glucides: { nom: 'Glucides', unite: 'g' },
  lipides: { nom: 'Lipides', unite: 'g' },
};

const panneau = document.getElementById('detail-jour');
const titre = document.getElementById('titre-detail');
const statutGlobal = document.getElementById('detail-statut-global');
const tableau = document.getElementById('detail-tableau');
const corpsTableau = tableau.querySelector('tbody');
const listeRepas = document.getElementById('detail-repas');
const aucunRepas = document.getElementById('detail-aucun-repas');

const formatDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

let cleOrigine = null;

function creerStatut({ couleur, libelle }, prefixe = '') {
  const statut = document.createElement('span');
  statut.className = 'statut';
  const pastille = document.createElement('span');
  pastille.className = `pastille pastille--${couleur}`;
  pastille.setAttribute('aria-hidden', 'true');
  statut.append(pastille, `${prefixe}${libelle}`);
  return statut;
}

function cellule(contenu, balise = 'td') {
  const element = document.createElement(balise);
  element.append(contenu);
  return element;
}

// Ligne d'une métrique : consommé / objectif, pourcentage de l'objectif et statut.
function creerLigne(jour, score, metrique) {
  const { nom, unite } = LIBELLES[metrique];
  const consomme = formaterNombre(jour.totaux[metrique], 1);
  const ligne = document.createElement('tr');
  ligne.append(cellule(nom, 'th'));
  if (score) {
    const objectif = formaterNombre(jour.objectifs[metrique], 1);
    ligne.append(
      cellule(`${consomme} / ${objectif} ${unite}`),
      cellule(`${formaterNombre(score[metrique].ratio * 100, 0)} %`),
    );
  } else {
    ligne.append(cellule(`${consomme} ${unite}`), cellule('—'));
  }
  ligne.append(cellule(creerStatut(statutDuJour(jour, metrique))));
  ligne.firstChild.setAttribute('scope', 'row');
  return ligne;
}

function creerRepas(repas) {
  const element = document.createElement('li');
  element.className = 'detail__repas';
  const heure = document.createElement('span');
  heure.className = 'detail__heure';
  heure.textContent = formatHeure.format(new Date(repas.pris_le));
  const nom = document.createElement('span');
  nom.className = 'detail__nom';
  nom.textContent = `${TYPES_REPAS[repas.type_repas] ?? 'Repas'} · ${repas.nom}`;
  const valeurs = document.createElement('span');
  valeurs.className = 'detail__valeurs';
  valeurs.textContent = formaterMacros(repas);
  element.append(heure, nom, valeurs);
  return element;
}

export function ouvrirDetail(jour) {
  cleOrigine = jour.cle;
  const date = formatDate.format(jour.date);
  titre.textContent = date[0].toUpperCase() + date.slice(1);
  statutGlobal.replaceChildren(creerStatut(statutDuJour(jour, 'global'), 'Global : '));

  // Les totaux affichés sont ceux de l'agrégation, c'est-à-dire la somme des repas listés ci-dessous.
  tableau.hidden = !jour.totaux;
  if (jour.totaux) {
    const score = jour.sansObjectif ? null : scoreJour(jour.totaux, jour.objectifs);
    corpsTableau.replaceChildren(...METRIQUES.map((metrique) => creerLigne(jour, score, metrique)));
  }

  const repasTries = [...jour.repas].sort((a, b) => new Date(a.pris_le) - new Date(b.pris_le));
  listeRepas.replaceChildren(...repasTries.map(creerRepas));
  listeRepas.hidden = repasTries.length === 0;
  aucunRepas.hidden = repasTries.length > 0;

  panneau.showModal();
}

export function initialiserDetail() {
  panneau.querySelector('.panneau__fermer').addEventListener('click', () => panneau.close());
  // Un toucher sur le voile (hors du contenu) a pour cible le <dialog> lui-même.
  panneau.addEventListener('click', ({ target }) => {
    if (target === panneau) panneau.close();
  });
  // Échap ferme nativement le <dialog> ; dans tous les cas, le focus revient sur la case d'origine.
  panneau.addEventListener('close', () => {
    document.querySelector(`.calendrier__case[data-jour="${cleOrigine}"]`)?.focus();
  });
}
