// Date locale de l'appareil au format AAAA-MM-JJ (et non la date UTC de toISOString).
export function dateLocaleISO(date = new Date()) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}
