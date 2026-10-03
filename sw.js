// Mica — service worker : met en cache le shell de l'app (HTML, CSS, JS, vendor, icônes).
// Après un déploiement, incrémenter VERSION suffit : le nouveau cache remplace l'ancien.
const VERSION = 'mica-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/styles.css',
  './vendor/supabase.js',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo.png',
  './js/app.js',
  './js/config/defauts.js',
  './js/config/seuils.js',
  './js/domaine/agregation.js',
  './js/domaine/calcul-objectifs.js',
  './js/domaine/coherence-calorique.js',
  './js/domaine/dates.js',
  './js/domaine/scoring.js',
  './js/domaine/statistiques.js',
  './js/domaine/suggestions.js',
  './js/services/donnees-recap.js',
  './js/services/objectifs.js',
  './js/services/repas.js',
  './js/services/reseau.js',
  './js/services/stockage-local.js',
  './js/services/supabase.js',
  './js/utils/export.js',
  './js/utils/nombres.js',
  './js/utils/texte.js',
  './js/vues/calendrier.js',
  './js/vues/carte-poids.js',
  './js/vues/carte-resultat.js',
  './js/vues/detail-jour.js',
  './js/vues/edition-repas.js',
  './js/vues/formulaire-repas.js',
  './js/vues/formulaire.js',
  './js/vues/graphique-ligne.js',
  './js/vues/historique.js',
  './js/vues/reglages.js',
  './js/vues/saisie.js',
  './js/vues/suggestions.js',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

// Supprime les caches des versions précédentes.
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== VERSION).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()),
  );
});

// Cache d'abord pour le shell. Seules les requêtes GET vers l'origine de l'app sont concernées :
// les appels à Supabase (autre domaine) passent toujours par le réseau et ne sont jamais mis en cache.
self.addEventListener('fetch', (evenement) => {
  const { request } = evenement;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  evenement.respondWith(
    caches.match(request, { ignoreSearch: true }).then((enCache) => {
      if (enCache) return enCache;
      return fetch(request).then((reponse) => {
        // Un fichier du shell oublié dans la liste est ajouté au cache à sa première lecture.
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copie));
        }
        return reponse;
      });
    }),
  );
});
