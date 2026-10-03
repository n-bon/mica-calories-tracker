// Clé de comparaison : minuscules, sans accents ni ligatures (« Bœuf » = « boeuf »), espaces réduits.
export function normaliser(texte) {
  return String(texte)
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
