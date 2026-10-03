export const TOLERANCE_COHERENCE = 0.15;

// Énergie déduite des macronutriments : 4 kcal par gramme de protéines et de glucides, 9 kcal par gramme de lipides.
export function caloriesEstimees({ proteines, glucides, lipides }) {
  return 4 * proteines + 4 * glucides + 9 * lipides;
}

// Vrai si les calories saisies s'écartent de plus de 15 % de l'estimation.
export function estIncoherent(calories, macros) {
  const estimation = caloriesEstimees(macros);
  return Math.abs(calories - estimation) > TOLERANCE_COHERENCE * estimation;
}
