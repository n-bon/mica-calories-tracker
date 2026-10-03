import { agregerParJour } from '../domaine/agregation.js';
import { ajouterJours, joursDePlage } from '../domaine/dates.js';
import { moyenneScores, scoresJournaliers } from '../domaine/statistiques.js';
import { chargerDonneesRecap } from '../services/donnees-recap.js';
import { ETATS, lireEtat } from '../services/supabase.js';
import { formaterNombre } from '../utils/nombres.js';
import { dessinerGraphique } from './graphique-ligne.js';

const valeur = document.getElementById('resultat-valeur');
const graphique = document.getElementById('resultat-graphique');
const COULEURS = ['vert', 'orange', 'rouge'];

const pourcent = (score) => `${formaterNombre(score, 0)} %`;

// Moyenne des scores sur les 90 derniers jours (global, jour courant exclu), colorée selon son statut.
export async function afficherCarteResultat() {
  valeur.textContent = '—';
  valeur.classList.remove(...COULEURS.map((couleur) => `synthese__valeur--${couleur}`));
  graphique.replaceChildren();
  if (lireEtat() !== ETATS.connecte) return;

  let donnees;
  try {
    donnees = await chargerDonneesRecap();
  } catch {
    return;
  }
  const jours = agregerParJour(donnees.repas, donnees.versions, joursDePlage(donnees.plage));
  const scores = scoresJournaliers(jours);
  const moyenne = moyenneScores(scores);
  if (!moyenne) return;

  valeur.textContent = pourcent(moyenne.valeur);
  valeur.classList.add(`synthese__valeur--${moyenne.couleur}`);
  dessinerGraphique(graphique, {
    titre: 'Score de réalisation quotidien',
    serie: scores,
    domaineDates: { debut: donnees.plage.debut, fin: ajouterJours(donnees.plage.fin, -1) },
    domaineValeurs: { min: Math.min(...scores.map(({ valeur: score }) => score)), max: Math.max(...scores.map(({ valeur: score }) => score)) },
    formaterValeur: pourcent,
  });
}
