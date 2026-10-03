import { lireConfig } from '../services/stockage-local.js';
import {
  ETATS,
  connecter,
  deconnecter,
  surChangementEtat,
  validerConnexion,
} from '../services/supabase.js';

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

const CHAMPS = ['url', 'clePublishable', 'email', 'motDePasse'];

const formulaire = document.getElementById('formulaire-connexion');
const etatConnexion = document.getElementById('etat-connexion');
const etatLibelle = etatConnexion.querySelector('.etat__libelle');
const etatAide = document.getElementById('aide-etat-connexion');
const message = document.getElementById('message-connexion');
const messageTexte = message.querySelector('.message__texte');
const boutonConnecter = document.getElementById('bouton-connecter');
const boutonDeconnecter = document.getElementById('bouton-deconnecter');

function champ(nom) {
  return formulaire.elements[nom];
}

function zoneErreur(nom) {
  return document.getElementById(`erreur-${nom}`);
}

function afficherErreurChamp(nom, texte) {
  const zone = zoneErreur(nom);
  zone.querySelector('.champ__erreur-texte').textContent = texte;
  zone.hidden = false;
  champ(nom).setAttribute('aria-invalid', 'true');
}

function effacerErreurs() {
  CHAMPS.forEach((nom) => {
    zoneErreur(nom).hidden = true;
    champ(nom).removeAttribute('aria-invalid');
  });
  message.hidden = true;
}

function afficherMessage(type, texte) {
  message.classList.toggle('message--succes', type === 'succes');
  message.classList.toggle('message--erreur', type === 'erreur');
  message.querySelector('.message__symbole').textContent = type === 'succes' ? '✓' : '!';
  messageTexte.textContent = texte;
  message.hidden = false;
}

function lireValeurs() {
  return {
    url: champ('url').value.trim(),
    clePublishable: champ('clePublishable').value.trim(),
    email: champ('email').value.trim(),
    motDePasse: champ('motDePasse').value,
  };
}

function afficherEtat(etat) {
  const { libelle, aide } = LIBELLES_ETAT[etat];
  etatLibelle.textContent = libelle;
  etatAide.textContent = aide;
  etatConnexion.classList.toggle('etat--actif', etat === ETATS.connecte);
  boutonDeconnecter.disabled = etat !== ETATS.connecte;
}

async function soumettre(evenement) {
  evenement.preventDefault();
  effacerErreurs();

  const valeurs = lireValeurs();
  const erreurs = validerConnexion(valeurs);
  const champsEnErreur = CHAMPS.filter((nom) => erreurs[nom]);
  if (champsEnErreur.length > 0) {
    champsEnErreur.forEach((nom) => afficherErreurChamp(nom, erreurs[nom]));
    champ(champsEnErreur[0]).focus();
    return;
  }

  boutonConnecter.disabled = true;
  boutonConnecter.textContent = 'Connexion…';
  try {
    await connecter(valeurs);
    champ('motDePasse').value = '';
    champ('url').value = new URL(valeurs.url).origin;
    afficherMessage('succes', 'Connexion réussie.');
  } catch (erreur) {
    if (erreur.champ) {
      afficherErreurChamp(erreur.champ, erreur.message);
      champ(erreur.champ).focus();
    } else {
      afficherMessage('erreur', erreur.message);
    }
  } finally {
    boutonConnecter.disabled = false;
    boutonConnecter.textContent = 'Se connecter';
  }
}

async function seDeconnecter() {
  effacerErreurs();
  boutonDeconnecter.disabled = true;
  await deconnecter();
  afficherMessage('succes', 'Déconnexion effectuée. URL, clé et email restent enregistrés sur cet appareil.');
}

export function focaliserConnexion() {
  const premierVide = CHAMPS.find((nom) => !champ(nom).value);
  champ(premierVide ?? 'motDePasse').focus();
}

export function initialiserReglages() {
  const config = lireConfig();
  if (config) {
    champ('url').value = config.url;
    champ('clePublishable').value = config.clePublishable;
    champ('email').value = config.email;
  }

  formulaire.addEventListener('submit', soumettre);
  boutonDeconnecter.addEventListener('click', seDeconnecter);
  surChangementEtat(afficherEtat);
}
