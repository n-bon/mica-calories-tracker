import { dernierPoids, seriePoids } from '../domaine/statistiques.js';
import { chargerDonneesRecap } from '../services/donnees-recap.js';
import { ETATS, lireEtat } from '../services/supabase.js';
import { formaterNombre } from '../utils/nombres.js';
import { dessinerGraphique } from './graphique-ligne.js';

const valeur = document.getElementById('poids-valeur');
const graphique = document.getElementById('poids-graphique');

export async function afficherCartePoids() {
  valeur.textContent = '—';
  graphique.replaceChildren();
  if (lireEtat() !== ETATS.connecte) return;

  let donnees;
  try {
    donnees = await chargerDonneesRecap();
  } catch {
    return;
  }
  const actuel = dernierPoids(donnees.versions);
  if (!actuel) return;

  valeur.textContent = formaterNombre(actuel.valeur, 1);
  const serie = seriePoids(donnees.versions, donnees.plage);
  const valeurs = serie.map(({ valeur: poids }) => poids);
  dessinerGraphique(graphique, {
    titre: 'Évolution du poids',
    serie,
    domaineDates: donnees.plage,
    domaineValeurs: { min: Math.min(...valeurs), max: Math.max(...valeurs) },
    relierTout: true,
    formaterValeur: (poids) => `${formaterNombre(poids, 1)} kg`,
  });
}
