import { MODES, MODE_PAR_DEFAUT } from '../config/defauts.js';
import { calculerObjectifs } from '../domaine/calcul-objectifs.js';
import { invaliderDonneesRecap } from '../services/donnees-recap.js';
import { enregistrerVersion, lireObjectifsBruts, lireVersions } from '../services/objectifs.js';
import { lireTousLesRepas } from '../services/repas.js';
import { lireConfig } from '../services/stockage-local.js';
import {
  ETATS,
  connecter,
  deconnecter,
  lireEtat,
  surChangementEtat,
  validerConnexion,
} from '../services/supabase.js';
import { genererCSV, genererJSON, nomFichier, telecharger } from '../utils/export.js';
import { arrondir, formaterNombre, lireNombre } from '../utils/nombres.js';
import {
  afficherErreurChamp,
  afficherMessage,
  effacerErreurs,
  messageErreurSupabase,
} from './formulaire.js';

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
const CHAMPS_POIDS = ['poidsActuel', 'poidsCible'];
const CHAMPS_COEFS = METRIQUES.map(nomCoef);

const POIDS_MAX = 500;
const COEF_MAX = 999;

const formProfil = document.getElementById('formulaire-profil');
const formCalcul = document.getElementById('formulaire-calcul');
const aideVersion = document.getElementById('aide-version-objectifs');
const apercu = Object.fromEntries(
  METRIQUES.map((metrique) => [metrique, document.getElementById(`apercu-${metrique}`)]),
);

// Chaque carte a son propre bouton, visible seulement si sa saisie diffère de la version enregistrée.
const ENREGISTREMENTS = {
  poids: {
    formulaire: formProfil,
    champs: CHAMPS_POIDS,
    bouton: document.getElementById('bouton-enregistrer-poids'),
    aide: document.getElementById('aide-enregistrer-poids'),
    libelle: 'Enregistrer le poids',
  },
  coefs: {
    formulaire: formCalcul,
    champs: CHAMPS_COEFS,
    bouton: document.getElementById('bouton-enregistrer-objectifs'),
    aide: document.getElementById('aide-enregistrer-objectifs'),
    libelle: 'Enregistrer les objectifs',
  },
};

let mode = MODE_PAR_DEFAUT;
let versionChargee = false;
let enregistrementEnCours = false;
// Dernière version chargée ou enregistrée ; sans version, poids vides et coefficients par défaut.
let reference = { poidsActuel: NaN, poidsCible: NaN, coefs: { ...MODES[mode].coefs } };

function champObjectifs(nom) {
  return formProfil.elements[nom] ?? formCalcul.elements[nom];
}

function remplirCoefs(coefs) {
  METRIQUES.forEach((metrique) => {
    champObjectifs(nomCoef(metrique)).value = formaterNombre(coefs[metrique], 2, { groupement: false });
  });
}

// Valeurs arrondies à la précision de la base (poids au dixième, coefficients au centième),
// pour que l'aperçu et la détection de changement portent sur ce qui sera enregistré.
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

function validerPoids(valeurs) {
  const erreurs = {};
  CHAMPS_POIDS.forEach((nom) => {
    const poids = valeurs[nom];
    if (!(poids > 0)) {
      erreurs[nom] = 'Saisir un poids en kg, par exemple 78,5.';
    } else if (poids > POIDS_MAX) {
      erreurs[nom] = `Poids trop élevé : ${POIDS_MAX} kg maximum.`;
    }
  });
  return erreurs;
}

function validerCoefs(coefs) {
  const erreurs = {};
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

const memeValeur = (a, b) => a === b || (Number.isNaN(a) && Number.isNaN(b));

function mettreAJourBoutons() {
  const valeurs = lireValeursObjectifs();
  const modifie = {
    poids: CHAMPS_POIDS.some((nom) => !memeValeur(valeurs[nom], reference[nom])),
    coefs: METRIQUES.some((metrique) => !memeValeur(valeurs.coefs[metrique], reference.coefs[metrique])),
  };
  const connecte = lireEtat() === ETATS.connecte;
  Object.entries(ENREGISTREMENTS).forEach(([cle, { bouton, aide }]) => {
    bouton.hidden = !modifie[cle];
    bouton.disabled = !connecte || enregistrementEnCours;
    aide.hidden = !modifie[cle] || connecte;
  });
}

function surSaisie(evenement) {
  evenement.currentTarget.querySelector('.message').hidden = true;
  mettreAJourApercu();
  mettreAJourBoutons();
}

function afficherDateVersion(dateEffet) {
  const date = new Date(`${dateEffet}T00:00:00`);
  const libelle = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  aideVersion.textContent = `Objectifs en vigueur depuis le ${libelle}.`;
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
    reference = { poidsActuel: derniere.poidsActuel, poidsCible: derniere.poidsCible, coefs: derniere.coefs };
    champObjectifs('poidsActuel').value = formaterNombre(derniere.poidsActuel, 1, { groupement: false });
    champObjectifs('poidsCible').value = formaterNombre(derniere.poidsCible, 1, { groupement: false });
    remplirCoefs(derniere.coefs);
    mettreAJourApercu();
    afficherDateVersion(derniere.dateEffet);
  } catch (erreur) {
    versionChargee = false;
    afficherMessage(formCalcul, 'erreur', messageErreurSupabase(erreur, 'Lecture des objectifs', 'objectifs'));
  } finally {
    mettreAJourBoutons();
  }
}

function retablirCoefs() {
  effacerErreurs(formCalcul, CHAMPS_COEFS);
  remplirCoefs(MODES[mode].coefs);
  mettreAJourApercu();
  mettreAJourBoutons();
}

// Enregistre une nouvelle version du jour : la carte concernée fournit ses valeurs saisies,
// l'autre carte ses valeurs déjà enregistrées.
async function enregistrer(cle, valeurs, erreurs, messageSucces) {
  const { formulaire, champs, bouton, libelle } = ENREGISTREMENTS[cle];
  effacerErreurs(formulaire, champs);

  const champsEnErreur = champs.filter((nom) => erreurs[nom]);
  if (champsEnErreur.length > 0) {
    champsEnErreur.forEach((nom) => afficherErreurChamp(formulaire, nom, erreurs[nom]));
    champObjectifs(champsEnErreur[0]).focus();
    return;
  }

  enregistrementEnCours = true;
  mettreAJourBoutons();
  bouton.textContent = 'Enregistrement…';
  try {
    const version = await enregistrerVersion({
      mode,
      ...valeurs,
      objectifs: calculerObjectifs(valeurs.poidsActuel, valeurs.poidsCible, valeurs.coefs),
    });
    reference = { poidsActuel: version.poidsActuel, poidsCible: version.poidsCible, coefs: version.coefs };
    invaliderDonneesRecap();
    afficherDateVersion(version.dateEffet);
    afficherMessage(formulaire, 'succes', messageSucces);
  } catch (erreur) {
    afficherMessage(formulaire, 'erreur', messageErreurSupabase(erreur, 'Enregistrement', 'objectifs'));
  } finally {
    enregistrementEnCours = false;
    bouton.textContent = libelle;
    mettreAJourBoutons();
  }
}

function enregistrerPoids(evenement) {
  evenement.preventDefault();
  const { poidsActuel, poidsCible } = lireValeursObjectifs();
  const valeurs = { poidsActuel, poidsCible, coefs: reference.coefs };
  enregistrer('poids', valeurs, validerPoids(valeurs), 'Poids enregistré.');
}

function enregistrerCoefs(evenement) {
  evenement.preventDefault();
  if (Object.keys(validerPoids(reference)).length > 0) {
    effacerErreurs(formCalcul, CHAMPS_COEFS);
    afficherMessage(formCalcul, 'erreur', 'Aucun poids enregistré : renseigner puis enregistrer le poids dans la carte Profil.');
    return;
  }
  const { coefs } = lireValeursObjectifs();
  const valeurs = { poidsActuel: reference.poidsActuel, poidsCible: reference.poidsCible, coefs };
  enregistrer('coefs', valeurs, validerCoefs(coefs), 'Objectifs enregistrés.');
}

export function afficherReglages() {
  chargerDerniereVersion();
}

/* ==========================================================================
   Export
   ========================================================================== */

const carteExport = document.getElementById('carte-export');
const boutonsExport = {
  json: document.getElementById('bouton-export-json'),
  csv: document.getElementById('bouton-export-csv'),
};
let exportEnCours = false;

function mettreAJourExport() {
  const actif = lireEtat() === ETATS.connecte && !exportEnCours;
  Object.values(boutonsExport).forEach((bouton) => {
    bouton.disabled = !actif;
  });
}

// JSON : sauvegarde complète (repas + objectifs) ; CSV : repas seuls, pour un tableur.
async function exporter(format) {
  const bouton = boutonsExport[format];
  const libelle = bouton.textContent;
  carteExport.querySelector('.message').hidden = true;
  exportEnCours = true;
  mettreAJourExport();
  bouton.textContent = 'Export…';
  try {
    if (format === 'json') {
      const [repas, objectifs] = await Promise.all([lireTousLesRepas(), lireObjectifsBruts()]);
      telecharger(genererJSON({ repas, objectifs }), nomFichier('json'), 'application/json');
    } else {
      telecharger(genererCSV(await lireTousLesRepas()), nomFichier('csv'), 'text/csv;charset=utf-8');
    }
  } catch (erreur) {
    afficherMessage(carteExport, 'erreur', messageErreurSupabase(erreur, 'Export', 'repas'));
  } finally {
    exportEnCours = false;
    bouton.textContent = libelle;
    mettreAJourExport();
  }
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
  mettreAJourExport();

  mettreAJourBoutons();
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
  formProfil.addEventListener('submit', enregistrerPoids);
  formCalcul.addEventListener('submit', enregistrerCoefs);
  formProfil.addEventListener('input', surSaisie);
  formCalcul.addEventListener('input', surSaisie);
  document.getElementById('bouton-retablir-coefs').addEventListener('click', retablirCoefs);
  boutonsExport.json.addEventListener('click', () => exporter('json'));
  boutonsExport.csv.addEventListener('click', () => exporter('csv'));
  surChangementEtat(afficherEtat);
}
