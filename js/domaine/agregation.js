import { METRIQUES } from '../config/seuils.js';
import { arrondir } from '../utils/nombres.js';
import { dateDepuisISO, dateLocaleISO } from './dates.js';

// Somme des quatre métriques d'une liste de repas, arrondie au dixième.
export function totaliser(repas) {
  return Object.fromEntries(METRIQUES.map((metrique) => [
    metrique,
    arrondir(repas.reduce((somme, un) => somme + Number(un[metrique]), 0), 1),
  ]));
}

// Version des objectifs en vigueur un jour donné : la plus récente dont date_effet ≤ jour.
// versions est trié par date_effet croissante ; renvoie null si le jour précède toute version.
export function versionEnVigueur(versions, cleJour) {
  let enVigueur = null;
  for (const version of versions) {
    if (version.dateEffet > cleJour) break;
    enVigueur = version;
  }
  return enVigueur;
}

// Un élément par jour de la plage : repas du jour (rattachés au jour local de pris_le), totaux
// (null sans repas) et objectifs en vigueur (null si le jour précède toute version : « sans objectif »).
export function agregerParJour(repas, versions, jours) {
  const parJour = new Map(jours.map((date) => [dateLocaleISO(date), []]));
  repas.forEach((un) => {
    parJour.get(dateLocaleISO(new Date(un.pris_le)))?.push(un);
  });

  return jours.map((date) => {
    const cle = dateLocaleISO(date);
    const repasDuJour = parJour.get(cle);
    const version = versionEnVigueur(versions, cle);
    return {
      cle,
      date,
      repas: repasDuJour,
      totaux: repasDuJour.length > 0 ? totaliser(repasDuJour) : null,
      objectifs: version ? version.objectifs : null,
      sansObjectif: version === null,
    };
  });
}

// Repas triés du plus récent au plus ancien, regroupés par jour local de pris_le (jours sans repas absents).
export function grouperParJour(repas) {
  const jours = new Map();
  repas.forEach((un) => {
    const cle = dateLocaleISO(new Date(un.pris_le));
    if (!jours.has(cle)) jours.set(cle, []);
    jours.get(cle).push(un);
  });
  return [...jours].map(([cle, repasDuJour]) => ({
    cle,
    date: dateDepuisISO(cle),
    repas: repasDuJour,
    totaux: totaliser(repasDuJour),
  }));
}
