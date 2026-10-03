import { arrondir } from '../utils/nombres.js';

// Mode « Perte de masse graisse » : calories et lipides suivent le poids actuel,
// protéines et glucides le poids cible. Arrondi au dixième, comme en base (numeric(7,1)).
export function calculerObjectifs(poidsActuel, poidsCible, coefs) {
  return {
    calories: arrondir(poidsActuel * coefs.calories, 1),
    proteines: arrondir(poidsCible * coefs.proteines, 1),
    glucides: arrondir(poidsCible * coefs.glucides, 1),
    lipides: arrondir(poidsActuel * coefs.lipides, 1),
  };
}
