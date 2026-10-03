// Date locale de l'appareil au format AAAA-MM-JJ (et non la date UTC de toISOString).
export function dateLocaleISO(date = new Date()) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

// Valeur d'un champ datetime-local (AAAA-MM-JJTHH:MM) à l'heure locale de l'appareil.
export function dateHeureLocaleISO(date = new Date()) {
  const heures = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateLocaleISO(date)}T${heures}:${minutes}`;
}
