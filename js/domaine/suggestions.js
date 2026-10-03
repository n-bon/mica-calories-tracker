import { normaliser } from '../utils/texte.js';

export const SUGGESTIONS_MAX = 8;

// Index des repas par nom normalisé : nom d'affichage, nombre d'occurrences et valeurs de la saisie
// la plus récente (au sens de pris_le).
export function creerIndex(repas = []) {
  const index = new Map();
  repas.forEach((un) => ajouterAuIndex(index, un));
  return index;
}

export function ajouterAuIndex(index, { nom, pris_le: prisLe, calories, proteines, glucides, lipides }) {
  const cle = normaliser(nom);
  if (!cle) return;
  const date = new Date(prisLe);
  const valeurs = {
    calories: Number(calories),
    proteines: Number(proteines),
    glucides: Number(glucides),
    lipides: Number(lipides),
  };
  const entree = index.get(cle);
  if (!entree) {
    index.set(cle, { cle, nom: nom.trim(), occurrences: 1, derniereDate: date, valeurs });
    return;
  }
  entree.occurrences += 1;
  if (date >= entree.derniereDate) {
    entree.nom = nom.trim();
    entree.derniereDate = date;
    entree.valeurs = valeurs;
  }
}

// Correspondance « contient » sur le nom normalisé, triée par fréquence puis par récence.
export function chercherSuggestions(index, saisie, limite = SUGGESTIONS_MAX) {
  const recherche = normaliser(saisie);
  if (!recherche) return [];
  return [...index.values()]
    .filter((entree) => entree.cle.includes(recherche))
    .sort((a, b) => b.occurrences - a.occurrences || b.derniereDate - a.derniereDate)
    .slice(0, limite);
}
