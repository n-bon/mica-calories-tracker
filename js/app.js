import { ETATS, demarrer, surChangementEtat } from './services/supabase.js';
import { afficherCalendrier } from './vues/calendrier.js';
import { afficherReglages, focaliserConnexion, initialiserReglages } from './vues/reglages.js';
import { afficherSaisie, initialiserSaisie } from './vues/saisie.js';

const onglets = document.querySelectorAll('.onglets__onglet');
const vues = document.querySelectorAll('.vue');
const bandeau = document.getElementById('bandeau-connexion');
const bandeauTexte = bandeau.querySelector('.bandeau__texte');

const TEXTES_BANDEAU = {
  [ETATS.nonConfigure]: 'Mica n’est pas encore relié à Supabase. Renseigner la connexion dans Réglages → Connexion.',
  [ETATS.deconnecte]: 'Non connecté. Saisir le mot de passe dans Réglages → Connexion.',
  [ETATS.sessionExpiree]: 'Session expirée. Saisir à nouveau le mot de passe dans Réglages → Connexion.',
  [ETATS.injoignable]: 'Supabase est injoignable. Vérifier la connexion internet, puis recharger la page.',
};

function afficherVue(idVue) {
  vues.forEach((vue) => vue.classList.toggle('vue--active', vue.id === idVue));

  onglets.forEach((onglet) => {
    const actif = onglet.getAttribute('href') === `#${idVue}`;
    onglet.classList.toggle('onglets__onglet--actif', actif);
    if (actif) {
      onglet.setAttribute('aria-current', 'page');
    } else {
      onglet.removeAttribute('aria-current');
    }
  });

  window.scrollTo(0, 0);
  if (idVue === 'vue-saisie') afficherSaisie();
  if (idVue === 'vue-calendrier') afficherCalendrier();
  if (idVue === 'vue-reglages') afficherReglages();
}

function afficherBandeau(etat) {
  bandeau.hidden = etat === ETATS.connecte || etat === ETATS.verification;
  if (!bandeau.hidden) bandeauTexte.textContent = TEXTES_BANDEAU[etat];
}

onglets.forEach((onglet) => {
  onglet.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    afficherVue(onglet.getAttribute('href').slice(1));
  });
});

bandeau.querySelector('.bandeau__lien').addEventListener('click', (evenement) => {
  evenement.preventDefault();
  afficherVue('vue-reglages');
  focaliserConnexion();
});

initialiserSaisie();
initialiserReglages();
surChangementEtat(afficherBandeau);
surChangementEtat(() => {
  if (document.getElementById('vue-calendrier').classList.contains('vue--active')) afficherCalendrier();
});
demarrer();
