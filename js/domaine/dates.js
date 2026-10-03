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

// Minuit local du jour de la date donnée.
export function debutJour(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Ajoute des jours calendaires (et non 24 h) : reste juste lors des changements d'heure.
export function ajouterJours(date, nombre) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + nombre);
}

// Tous les jours (minuit local) de debut à fin inclus.
export function joursDePlage({ debut, fin }) {
  const jours = [];
  for (let jour = debutJour(debut); jour <= fin; jour = ajouterJours(jour, 1)) jours.push(jour);
  return jours;
}

// Plage de nombreJours se terminant aujourd'hui inclus.
export function plageDerniersJours(nombreJours, aujourdHui = new Date()) {
  const fin = debutJour(aujourdHui);
  return { debut: ajouterJours(fin, -(nombreJours - 1)), fin };
}

// Bornes d'une requête sur pris_le (§ 2.6) : début du premier jour local, début du lendemain du dernier, en ISO UTC.
export function bornesUTC({ debut, fin }) {
  return { depuis: debutJour(debut).toISOString(), avant: ajouterJours(fin, 1).toISOString() };
}

// Date locale (minuit) d'une valeur AAAA-MM-JJ, ou null si la valeur est vide ou invalide.
export function dateDepuisISO(valeur) {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur ?? '');
  if (!morceaux) return null;
  const [, annee, mois, jour] = morceaux.map(Number);
  const date = new Date(annee, mois - 1, jour);
  return date.getDate() === jour ? date : null;
}

// Nombre de jours d'une plage, bornes incluses (arrondi : un jour de changement d'heure dure 23 ou 25 h).
export function nombreDeJours({ debut, fin }) {
  return Math.round((debutJour(fin) - debutJour(debut)) / 86400000) + 1;
}
