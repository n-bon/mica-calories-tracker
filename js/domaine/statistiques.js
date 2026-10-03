import { dateDepuisISO, dateLocaleISO } from './dates.js';
import { couleur, couleurScore, scoreJour, scoreRealisation } from './scoring.js';

// Dernier poids déclaré (toutes versions confondues), ou null.
export function dernierPoids(versions) {
  const derniere = versions.at(-1);
  return derniere ? { valeur: derniere.poidsActuel, date: dateDepuisISO(derniere.dateEffet) } : null;
}

// Série du poids sur la plage : un point par déclaration (date_effet). Si une déclaration précède la plage,
// sa valeur est reportée au bord gauche pour que la courbe ne commence pas à vide.
export function seriePoids(versions, plage) {
  const debut = dateLocaleISO(plage.debut);
  const fin = dateLocaleISO(plage.fin);
  const serie = versions
    .filter(({ dateEffet }) => dateEffet >= debut && dateEffet <= fin)
    .map(({ dateEffet, poidsActuel }) => ({ date: dateDepuisISO(dateEffet), valeur: poidsActuel }));
  const anterieure = versions.filter(({ dateEffet }) => dateEffet < debut).at(-1);
  if (anterieure && serie[0]?.date.getTime() !== plage.debut.getTime()) {
    serie.unshift({ date: plage.debut, valeur: anterieure.poidsActuel });
  }
  return serie;
}

// Score de réalisation de chaque jour renseigné (au moins un repas et un objectif en vigueur),
// jour courant exclu car incomplet par nature.
export function scoresJournaliers(jours, cleAujourdhui = dateLocaleISO()) {
  return jours
    .filter((jour) => jour.cle !== cleAujourdhui && jour.totaux && !jour.sansObjectif)
    .map((jour) => {
      const ecart = scoreJour(jour.totaux, jour.objectifs)?.global.ecart ?? null;
      return ecart === null ? null : { date: jour.date, valeur: scoreRealisation(ecart), couleur: couleur(ecart) };
    })
    .filter(Boolean);
}

// Moyenne des scores journaliers, arrondie à l'entier, avec sa couleur de statut.
export function moyenneScores(scores) {
  if (scores.length === 0) return null;
  const moyenne = Math.round(scores.reduce((somme, { valeur }) => somme + valeur, 0) / scores.length);
  return { valeur: moyenne, couleur: couleurScore(moyenne), nombreJours: scores.length };
}
