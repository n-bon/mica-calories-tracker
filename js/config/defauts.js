export const MODE_PAR_DEFAUT = 'perte_masse_grasse';

export const MODES = {
  perte_masse_grasse: {
    libelle: 'Perte de masse graisse',
    coefs: { calories: 26, proteines: 2.2, glucides: 2.5, lipides: 0.9 },
  },
};

export const TYPES_REPAS = {
  petit_dejeuner: 'Petit déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
  boisson: 'Boisson',
};
