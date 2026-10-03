// Règles de couleur (tickets.md § 1.7) : seule source des seuils et des points d'ancrage.

export const METRIQUES = ['calories', 'proteines', 'glucides', 'lipides'];

// Écart normalisé maximal (au-delà, l'écart est plafonné).
export const ECART_MAX = 1;

// Échelle commune à toutes les métriques et au global : e ≤ vert → vert, e ≤ orange → orange, sinon rouge.
export const SEUILS = { vert: 0.1, orange: 0.2 };

// Points d'ancrage ratio → écart normalisé, triés par ratio croissant. Entre deux points, interpolation
// linéaire ; avant le premier et après le dernier, extrapolation avec la pente du segment extrême.
export const ANCRAGES = {
  // Vert de 90 à 100 %, le dépassement est sanctionné plus vite que le déficit.
  calories: [[0.8, 0.2], [0.9, 0.1], [0.95, 0], [1, 0.1], [1.05, 0.2]],
  // Dépasser est sans pénalité : le dernier segment est plat (écart nul au-delà de 100 %).
  proteines: [[0.85, 0.2], [0.95, 0.1], [1, 0], [2, 0]],
  // e = |r − 1|
  glucides: [[0, 1], [1, 0], [2, 1]],
  lipides: [[0, 1], [1, 0], [2, 1]],
};

export const STATUTS = {
  vert: 'Atteint',
  orange: 'Proche',
  rouge: 'Hors cible',
  vide: 'Pas de saisie',
};

// Jour avec repas mais antérieur à toute version d'objectifs : affiché en gris.
export const LIBELLE_SANS_OBJECTIF = 'Sans objectif';

// Signification de chaque couleur pour la légende du calendrier, à tenir à jour avec ANCRAGES et SEUILS.
export const SIGNIFICATIONS = {
  global: {
    vert: 'score du jour de 90 % ou plus',
    orange: 'score de 80 à 90 %',
    rouge: 'score inférieur à 80 %',
  },
  calories: {
    vert: '90 à 100 % de l’objectif',
    orange: '80 à 90 %, ou 100 à 105 %',
    rouge: 'moins de 80 %, ou plus de 105 %',
  },
  proteines: {
    vert: '95 % de l’objectif ou plus',
    orange: '85 à 95 %',
    rouge: 'moins de 85 %',
  },
  glucides: {
    vert: '90 à 110 % de l’objectif',
    orange: '80 à 90 %, ou 110 à 120 %',
    rouge: 'moins de 80 %, ou plus de 120 %',
  },
  lipides: {
    vert: '90 à 110 % de l’objectif',
    orange: '80 à 90 %, ou 110 à 120 %',
    rouge: 'moins de 80 %, ou plus de 120 %',
  },
};

export const SIGNIFICATION_VIDE = 'aucun repas saisi, ou aucun objectif en vigueur';

// Durée maximale d'une plage personnalisée du calendrier, en jours.
export const PLAGE_MAX = 366;
