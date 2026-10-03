// État du réseau de l'appareil (navigator.onLine et événements online / offline).
const abonnes = new Set();

export function estEnLigne() {
  return navigator.onLine;
}

export function surChangementReseau(rappel) {
  abonnes.add(rappel);
  rappel(estEnLigne());
}

function notifier() {
  abonnes.forEach((rappel) => rappel(estEnLigne()));
}

window.addEventListener('online', notifier);
window.addEventListener('offline', notifier);
