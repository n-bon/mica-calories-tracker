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
