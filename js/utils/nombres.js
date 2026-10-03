// Accepte la virgule ou le point comme séparateur décimal ; renvoie NaN si la saisie n'est pas un nombre positif.
export function lireNombre(texte) {
  const normalise = String(texte).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalise)) return NaN;
  return Number(normalise);
}

export function arrondir(nombre, decimales) {
  const facteur = 10 ** decimales;
  return Math.round(nombre * facteur) / facteur;
}

export function formaterNombre(nombre, decimales = 1, { groupement = true } = {}) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: decimales,
    useGrouping: groupement,
  }).format(nombre);
}

// Résumé des quatre valeurs d'un repas ou d'une journée : « 520 kcal · P 40 g · G 60 g · L 10 g ».
export function formaterMacros({ calories, proteines, glucides, lipides }) {
  const f = (valeur) => formaterNombre(Number(valeur), 1);
  return `${f(calories)} kcal · P ${f(proteines)} g · G ${f(glucides)} g · L ${f(lipides)} g`;
}
