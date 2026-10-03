import { dateLocaleISO, plageDerniersJours } from '../domaine/dates.js';
import { lireVersions } from './objectifs.js';
import { lireRepasDePlage } from './repas.js';

export const JOURS_SYNTHESE = 90;

let cache = null;

// Repas des 90 derniers jours et versions d'objectifs, partagés par les cartes de synthèse et le calendrier.
// Chargés une seule fois, puis rechargés après invalidation (saisie, objectifs, connexion) ou changement de jour.
export function chargerDonneesRecap() {
  const cle = dateLocaleISO();
  if (!cache || cache.cle !== cle) {
    const plage = plageDerniersJours(JOURS_SYNTHESE);
    const promesse = Promise.all([lireRepasDePlage(plage), lireVersions()])
      .then(([repas, versions]) => ({ plage, repas, versions }));
    cache = { cle, promesse };
    promesse.catch(() => {
      if (cache?.promesse === promesse) cache = null;
    });
  }
  return cache.promesse;
}

export function invaliderDonneesRecap() {
  cache = null;
}
