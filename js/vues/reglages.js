import { MODES, MODE_PAR_DEFAUT } from '../config/defauts.js';
import { calculerObjectifs } from '../domaine/calcul-objectifs.js';
import { enregistrerVersion, lireVersions } from '../services/objectifs.js';
import { lireConfig } from '../services/stockage-local.js';
import {
  ETATS,
  connecter,
  deconnecter,
  lireEtat,
  surChangementEtat,
  validerConnexion,
} from '../services/supabase.js';
import { arrondir, formaterNombre, lireNombre } from '../utils/nombres.js';
import { afficherErreurChamp, afficherMessage, effacerErreurs } from './formulaire.js';

/* ==========================================================================
   Connexion
   ========================================================================== */

const LIBELLES_ETAT = {
  [ETATS.verification]: {
    libelle: 'Vérification…',
    aide: 'Recherche d’une session ouverte sur cet appareil.',
  },
  [ETATS.nonConfigure]: {
    libelle: 'Non configuré',
    aide: 'Renseigner les quatre champs pour relier Mica au projet Supabase.',
  },
  [ETATS.deconnecte]: {
    libelle: 'Déconnecté',
    aide: 'Saisir le mot de passe pour se reconnecter.',
  },
  [ETATS.sessionExpiree]: {
    libelle: 'Session expirée',
    aide: 'Saisir à nouveau le mot de passe pour se reconnecter.',
  },
  [ETATS.injoignable]: {
    libelle: 'Supabase injoignable',
    aide: 'Vérifier la connexion internet, puis recharger la page.',
  },
  [ETATS.connecte]: {
    libelle: 'Connecté',
    aide: 'La session reste ouverte sur cet appareil.',
  },
};

const CHAMPS_CONNEXION = ['url', 'clePublishable', 'email', 'motDePasse'];

const formConnexion = document.getElementById('formulaire-connexion');
const etatConnexion = document.getElementById('etat-connexion');
const etatLibelle = etatConnexion.querySelector('.etat__libelle');
const etatAide = document.getElementById('aide-etat-connexion');
const boutonConnecter = document.getElementById('bouton-connecter');
const boutonDeconnecter = document.getElementById('bouton-deconnecter');

function champConnexion(nom) {
  return formConnexion.elements[nom];
}

function lireValeursConnexion() {
  return {
    url: champConnexion('url').value.trim(),
    clePublishable: champConnexion('clePublishable').value.trim(),
    email: champConnexion('email').value.trim(),
    motDePasse: champConnexion('motDePasse').value,
  };
}

async function seConnecter(evenement) {
  evenement.preventDefault();
  effacerErreurs(formConnexion, CHAMPS_CONNEXION);

  const valeurs = lireValeursConnexion();
  const erreurs = validerConnexion(valeurs);
  const champsEnErreur = CHAMPS_CONNEXION.filter((nom) => erreurs[nom]);
  if (champsEnErreur.length > 0) {
    champsEnErreur.forEach((nom) => afficherErreurChamp(formConnexion, nom, erreurs[nom]));
    champConnexion(champsEnErreur[0]).focus();
    return;
  }

  boutonConnecter.disabled = true;
  boutonConnecter.textContent = 'Connexion…';
  try {
    await connecter(valeurs);
    champConnexion('motDePasse').value = '';
    champConnexion('url').value = new URL(valeurs.url).origin;
    afficherMessage(formConnexion, 'succes', 'Connexion réussie.');
  } catch (erreur) {
    if (erreur.champ) {
      afficherErreurChamp(formConnexion, erreur.champ, erreur.message);
      champConnexion(erreur.champ).focus();
    } else {
      afficherMessage(formConnexion, 'erreur', erreur.message);
    }
  } finally {
    boutonConnecter.disabled = false;
    boutonConnecter.textContent = 'Se connecter';
  }
}

async function seDeconnecter() {
  effacerErreurs(formConnexion, CHAMPS_CONNEXION);
  boutonDeconnecter.disabled = true;
  await deconnecter();
  afficherMessage(formConnexion, 'succes', 'Déconnexion effectuée. URL, clé et email restent enregistrés sur cet appareil.');
}

export function focaliserConnexion() {
  const premierVide = CHAMPS_CONNEXION.find((nom) => !champConnexion(nom).value);
  champConnexion(premierVide ?? 'motDePasse').focus();
}

/* ==========================================================================
   Profil et calcul des objectifs
   ========================================================================== */

const METRIQUES = ['calories', 'proteines', 'glucides', 'lipides'];
const nomCoef = (metrique) => `coef${metrique[0].toUpperCase()}${metrique.slice(1)}`;
const CHAMPS_OBJECTIFS = ['poidsActuel', 'poidsCible', ...METRIQUES.map(nomCoef)];

const POIDS_MAX = 500;
const COEF_MAX = 999;

const formObjectifs = document.getElementById('formulaire-objectifs');
const boutonEnregistrer = document.getElementById('bouton-enregistrer-objectifs');
const aideEnregistrer = document.getElementById('aide-enregistrer-objectifs');
const aideVersion = document.getElementById('aide-version-objectifs');
const apercu = Object.fromEntries(
  METRIQUES.map((metrique) => [metrique, document.getElementById(`apercu-${metrique}`)]),
);

let mode = MODE_PAR_DEFAUT;
let versionChargee = false;

function champObjectifs(nom) {
  return formObjectifs.elements[nom];
}

function remplirCoefs(coefs) {
  METRIQUES.forEach((metrique) => {
    champObjectifs(nomCoef(metrique)).value = formaterNombre(coefs[metrique], 2, { groupement: false });
  });
}

// Valeurs arrondies à la précision de la base (poids au dixième, coefficients au centième),
// pour que l'aperçu affiche exactement ce qui sera enregistré.
function lireValeursObjectifs() {
  return {
    poidsActuel: arrondir(lireNombre(champObjectifs('poidsActuel').value), 1),
    poidsCible: arrondir(lireNombre(champObjectifs('poidsCible').value), 1),
    coefs: Object.fromEntries(
      METRIQUES.map((metrique) => [
        metrique,
        arrondir(lireNombre(champObjectifs(nomCoef(metrique)).value), 2),
      ]),
    ),
  };
}

function validerObjectifs({ poidsActuel, poidsCible, coefs }) {
  const erreurs = {};
  [['poidsActuel', poidsActuel], ['poidsCible', poidsCible]].forEach(([nom, poids]) => {
    if (!(poids > 0)) {
      erreurs[nom] = 'Saisir un poids en kg, par exemple 78,5.';
    } else if (poids > POIDS_MAX) {
      erreurs[nom] = `Poids trop élevé : ${POIDS_MAX} kg maximum.`;
    }
  });
  METRIQUES.forEach((metrique) => {
    const coef = coefs[metrique];
    if (!(coef > 0)) {
      erreurs[nomCoef(metrique)] = 'Saisir un coefficient supérieur à 0, par exemple 2,2.';
    } else if (coef > COEF_MAX) {
      erreurs[nomCoef(metrique)] = `Coefficient trop élevé : ${COEF_MAX} maximum.`;
    }
  });
  return erreurs;
}

// Aperçu en direct : une métrique s'affiche dès que son poids et son coefficient sont valides.
function mettreAJourApercu() {
  const { poidsActuel, poidsCible, coefs } = lireValeursObjectifs();
  const objectifs = calculerObjectifs(poidsActuel, poidsCible, coefs);
  METRIQUES.forEach((metrique) => {
    const valeur = objectifs[metrique];
    apercu[metrique].textContent = valeur > 0 ? formaterNombre(valeur, 1) : '—';
  });
}

function afficherDateVersion(dateEffet) {
  const date = new Date(`${dateEffet}T00:00:00`);
  const libelle = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  aideVersion.textContent = `Objectifs en vigueur depuis le ${libelle}.`;
}

function messageErreurObjectifs(erreur, action) {
  if (!navigator.onLine || /fetch/i.test(erreur.message)) {
    return `${action} impossible : Supabase injoignable. Vérifier la connexion internet, puis réessayer.`;
  }
  if (erreur.code === 'PGRST301' || erreur.code === 'PGRST303' || erreur.code === '42501') {
    return `${action} impossible : session expirée. Saisir à nouveau le mot de passe dans Réglages → Connexion.`;
  }
  if (erreur.code === '42P01' || erreur.code === 'PGRST205') {
    return `${action} impossible : table objectifs introuvable. Exécuter sql/schema.sql dans l’éditeur SQL de Supabase.`;
  }
  return `${action} impossible : ${erreur.message}`;
}

async function chargerDerniereVersion() {
  if (versionChargee || lireEtat() !== ETATS.connecte) return;
  versionChargee = true;
  try {
    const derniere = (await lireVersions()).at(-1);
    if (!derniere) {
      aideVersion.textContent = 'Aucun objectif enregistré pour le moment.';
      return;
    }
    mode = derniere.mode in MODES ? derniere.mode : MODE_PAR_DEFAUT;
    champObjectifs('poidsActuel').value = formaterNombre(derniere.poidsActuel, 1, { groupement: false });
    champObjectifs('poidsCible').value = formaterNombre(derniere.poidsCible, 1, { groupement: false });
    remplirCoefs(derniere.coefs);
    mettreAJourApercu();
    afficherDateVersion(derniere.dateEffet);
  } catch (erreur) {
    versionChargee = false;
    afficherMessage(formObjectifs, 'erreur', messageErreurObjectifs(erreur, 'Lecture des objectifs'));
  }
}

function retablirCoefs() {
  effacerErreurs(formObjectifs, CHAMPS_OBJECTIFS.filter((nom) => nom.startsWith('coef')));
  remplirCoefs(MODES[mode].coefs);
  mettreAJourApercu();
}

async function enregistrerObjectifs(evenement) {
  evenement.preventDefault();
  effacerErreurs(formObjectifs, CHAMPS_OBJECTIFS);

  const valeurs = lireValeursObjectifs();
  const erreurs = validerObjectifs(valeurs);
  const champsEnErreur = CHAMPS_OBJECTIFS.filter((nom) => erreurs[nom]);
  if (champsEnErreur.length > 0) {
    champsEnErreur.forEach((nom) => afficherErreurChamp(formObjectifs, nom, erreurs[nom]));
    champObjectifs(champsEnErreur[0]).focus();
    return;
  }

  boutonEnregistrer.disabled = true;
  boutonEnregistrer.textContent = 'Enregistrement…';
  try {
    const version = await enregistrerVersion({
      mode,
      ...valeurs,
      objectifs: calculerObjectifs(valeurs.poidsActuel, valeurs.poidsCible, valeurs.coefs),
    });
    afficherDateVersion(version.dateEffet);
    afficherMessage(formObjectifs, 'succes', 'Objectifs enregistrés.');
  } catch (erreur) {
    afficherMessage(formObjectifs, 'erreur', messageErreurObjectifs(erreur, 'Enregistrement'));
  } finally {
    boutonEnregistrer.textContent = 'Enregistrer les objectifs';
    boutonEnregistrer.disabled = lireEtat() !== ETATS.connecte;
  }
}

export function afficherReglages() {
  chargerDerniereVersion();
}

/* ==========================================================================
   Initialisation
   ========================================================================== */

function afficherEtat(etat) {
  const { libelle, aide } = LIBELLES_ETAT[etat];
  const connecte = etat === ETATS.connecte;
  etatLibelle.textContent = libelle;
  etatAide.textContent = aide;
  etatConnexion.classList.toggle('etat--actif', connecte);
  boutonDeconnecter.disabled = !connecte;

  boutonEnregistrer.disabled = !connecte;
  aideEnregistrer.hidden = connecte;
  if (connecte) {
    chargerDerniereVersion();
  } else {
    versionChargee = false;
  }
}

export function initialiserReglages() {
  const config = lireConfig();
  if (config) {
    champConnexion('url').value = config.url;
    champConnexion('clePublishable').value = config.clePublishable;
    champConnexion('email').value = config.email;
  }

  remplirCoefs(MODES[mode].coefs);
  mettreAJourApercu();

  formConnexion.addEventListener('submit', seConnecter);
  boutonDeconnecter.addEventListener('click', seDeconnecter);
  formObjectifs.addEventListener('submit', enregistrerObjectifs);
  formObjectifs.addEventListener('input', mettreAJourApercu);
  document.getElementById('bouton-retablir-coefs').addEventListener('click', retablirCoefs);
  surChangementEtat(afficherEtat);
}
