import {
  ANCRAGES,
  ECART_MAX,
  LIBELLE_SANS_OBJECTIF,
  METRIQUES,
  SEUILS,
  STATUTS,
} from '../config/seuils.js';
import { arrondir } from '../utils/nombres.js';

// Arrondi au millionième : évite qu'une erreur de virgule flottante fasse basculer un seuil
// (|1,10 − 1| vaut 0,10000000000000009 en JavaScript, soit orange au lieu de vert).
const PRECISION = 6;

function interpoler(ancrages, ratio) {
  const suivant = ancrages.findIndex(([x]) => ratio <= x);
  // Segment encadrant le ratio, ou segment extrême pour extrapoler.
  const fin = suivant === -1 ? ancrages.length - 1 : Math.max(suivant, 1);
  const [x0, y0] = ancrages[fin - 1];
  const [x1, y1] = ancrages[fin];
  return y0 + ((y1 - y0) * (ratio - x0)) / (x1 - x0);
}

// Écart normalisé d'une métrique pour un ratio consommé / objectif, entre 0 et 1.
export function ecartNormalise(metrique, ratio) {
  if (!Number.isFinite(ratio) || ratio < 0) return null;
  const ecart = Math.min(Math.max(interpoler(ANCRAGES[metrique], ratio), 0), ECART_MAX);
  return arrondir(ecart, PRECISION);
}

// Couleur d'un écart normalisé : 'vert', 'orange', 'rouge', ou 'vide' sans écart calculable.
export function couleur(ecart) {
  if (ecart === null || !Number.isFinite(ecart)) return 'vide';
  if (ecart <= SEUILS.vert) return 'vert';
  if (ecart <= SEUILS.orange) return 'orange';
  return 'rouge';
}

// Score d'un jour : ratio, écart et couleur de chaque métrique, puis global = moyenne des quatre écarts.
// Sans saisie ou sans objectifs en vigueur, renvoie null (case grisée). Une métrique dont l'objectif est
// nul ou absent n'a pas de score, et le global non plus.
export function scoreJour(totaux, objectifs) {
  if (!totaux || !objectifs) return null;

  const score = {};
  METRIQUES.forEach((metrique) => {
    const objectif = Number(objectifs[metrique]);
    const ratio = objectif > 0 ? Number(totaux[metrique] ?? 0) / objectif : null;
    const ecart = ratio === null ? null : ecartNormalise(metrique, ratio);
    score[metrique] = { ratio, ecart, couleur: couleur(ecart) };
  });

  const ecarts = METRIQUES.map((metrique) => score[metrique].ecart);
  const ecartGlobal = ecarts.includes(null)
    ? null
    : arrondir(ecarts.reduce((somme, ecart) => somme + ecart, 0) / ecarts.length, PRECISION);
  score.global = { ecart: ecartGlobal, couleur: couleur(ecartGlobal) };
  return score;
}

// Score de réalisation (§ 1.4.1) : 100 % − écart global × 100, plancher à 0 %.
export function scoreRealisation(ecartGlobal) {
  if (ecartGlobal === null || !Number.isFinite(ecartGlobal)) return null;
  return Math.max(0, arrondir(100 - ecartGlobal * 100, PRECISION - 2));
}

// Couleur et libellé d'un jour agrégé (domaine/agregation.js) pour une métrique ou le global.
export function statutDuJour(jour, metrique) {
  if (!jour.totaux) return { couleur: 'vide', libelle: STATUTS.vide };
  if (jour.sansObjectif) return { couleur: 'vide', libelle: LIBELLE_SANS_OBJECTIF };
  const teinte = couleur(scoreJour(jour.totaux, jour.objectifs)?.[metrique]?.ecart ?? null);
  return { couleur: teinte, libelle: STATUTS[teinte] };
}
