import { lireConfig, ecrireConfig } from './stockage-local.js';

const CLE_SESSION = 'mica.session';

export const ETATS = {
  verification: 'verification',
  nonConfigure: 'non-configure',
  deconnecte: 'deconnecte',
  sessionExpiree: 'session-expiree',
  injoignable: 'injoignable',
  connecte: 'connecte',
};

let client = null;
let signatureClient = '';
let abonnementAuth = null;
let deconnexionVolontaire = false;
let etat = ETATS.verification;
const abonnes = new Set();

export class ErreurConnexion extends Error {
  constructor(champ, message) {
    super(message);
    this.champ = champ;
  }
}

function definirEtat(nouvelEtat) {
  if (nouvelEtat === etat) return;
  etat = nouvelEtat;
  abonnes.forEach((rappel) => rappel(etat));
}

export function lireEtat() {
  return etat;
}

export function surChangementEtat(rappel) {
  abonnes.add(rappel);
  rappel(etat);
}

export function obtenirClient() {
  return client;
}

function sessionPresenteSurAppareil() {
  try {
    return localStorage.getItem(CLE_SESSION) !== null;
  } catch {
    return false;
  }
}

// Connexion à la base : un seul client par couple URL + clé, session persistée par supabase-js.
function creerClient({ url, clePublishable }) {
  const signature = `${url}|${clePublishable}`;
  if (client && signature === signatureClient) return client;

  if (client) {
    abonnementAuth?.unsubscribe();
    client.auth.stopAutoRefresh();
  }

  const instance = window.supabase.createClient(url, clePublishable, {
    auth: {
      storageKey: CLE_SESSION,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  // Une session perdue sans action de l'utilisateur (jeton de rafraîchissement refusé) est une session expirée.
  const { data } = instance.auth.onAuthStateChange((evenement) => {
    if (instance !== client) return;
    if (evenement === 'SIGNED_IN' || evenement === 'TOKEN_REFRESHED') {
      definirEtat(ETATS.connecte);
    } else if (evenement === 'SIGNED_OUT') {
      definirEtat(deconnexionVolontaire ? ETATS.deconnecte : ETATS.sessionExpiree);
    }
  });

  client = instance;
  signatureClient = signature;
  abonnementAuth = data.subscription;
  return client;
}

function configComplete(config) {
  return Boolean(config?.url && config.clePublishable && config.email);
}

export async function demarrer() {
  const config = lireConfig();
  if (!configComplete(config)) {
    definirEtat(ETATS.nonConfigure);
    return etat;
  }

  const sessionStockee = sessionPresenteSurAppareil();
  creerClient(config);
  const { data, error } = await client.auth.getSession();

  if (data.session) {
    definirEtat(ETATS.connecte);
  } else if (error && window.supabase.isAuthRetryableFetchError(error)) {
    definirEtat(ETATS.injoignable);
  } else if (sessionStockee) {
    definirEtat(ETATS.sessionExpiree);
  } else {
    definirEtat(ETATS.deconnecte);
  }
  return etat;
}

export function validerConnexion({ url, clePublishable, email, motDePasse }) {
  const erreurs = {};

  if (!url) {
    erreurs.url = "Saisir l'URL du projet Supabase.";
  } else {
    let adresse = null;
    try {
      adresse = new URL(url);
    } catch {
      adresse = null;
    }
    if (!adresse || adresse.protocol !== 'https:' || !adresse.hostname.endsWith('.supabase.co')) {
      erreurs.url = "URL invalide. Elle doit être de la forme https://votre-projet.supabase.co.";
    }
  }

  if (!clePublishable) {
    erreurs.clePublishable = 'Saisir la clé publishable du projet.';
  } else if (clePublishable.startsWith('sb_secret_')) {
    erreurs.clePublishable = 'Clé secret détectée : elle ne doit jamais être saisie ici. Utiliser la clé publishable (sb_publishable_…).';
  } else if (!clePublishable.startsWith('sb_publishable_')) {
    erreurs.clePublishable = 'La clé doit commencer par sb_publishable_. La copier depuis Supabase → Project Settings → API Keys.';
  }

  if (!email) {
    erreurs.email = "Saisir l'email de l'utilisateur Supabase.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erreurs.email = 'Email invalide. Vérifier son orthographe.';
  }

  if (!motDePasse) {
    erreurs.motDePasse = 'Saisir le mot de passe.';
  }

  return erreurs;
}

function traduireErreur(erreur) {
  const { isAuthRetryableFetchError } = window.supabase;

  if (erreur.code === 'invalid_credentials') {
    return new ErreurConnexion('motDePasse', 'Email ou mot de passe incorrect. Vérifier ces deux champs.');
  }
  if (erreur.code === 'email_not_confirmed') {
    return new ErreurConnexion('email', 'Email non confirmé. Confirmer cet utilisateur dans Supabase → Authentication → Users.');
  }
  if (erreur.status === 401 || /api key/i.test(erreur.message)) {
    return new ErreurConnexion('clePublishable', 'Clé publishable refusée par ce projet. La copier à nouveau depuis Supabase → Project Settings → API Keys.');
  }
  if (erreur.status === 404) {
    return new ErreurConnexion('url', "Aucun projet Supabase à cette URL. Vérifier l'URL du projet.");
  }
  if (erreur.status === 429) {
    return new ErreurConnexion(null, 'Trop de tentatives de connexion. Patienter quelques minutes, puis réessayer.');
  }
  if (isAuthRetryableFetchError(erreur)) {
    if (!navigator.onLine) {
      return new ErreurConnexion(null, "Pas de connexion internet. Réessayer une fois l'appareil connecté.");
    }
    return new ErreurConnexion('url', "Projet injoignable à cette URL. Vérifier l'URL du projet, ou qu'il n'est pas en pause dans Supabase.");
  }
  return new ErreurConnexion(null, 'Connexion impossible pour le moment. Réessayer dans quelques instants.');
}

export async function connecter({ url, clePublishable, email, motDePasse }) {
  const urlNormalisee = new URL(url).origin;
  creerClient({ url: urlNormalisee, clePublishable });

  const { error } = await client.auth.signInWithPassword({ email, password: motDePasse });

  if (error) {
    // Le client revient sur la config enregistrée, seule config dont on sait qu'elle fonctionne.
    await demarrer();
    throw traduireErreur(error);
  }

  ecrireConfig({ url: urlNormalisee, clePublishable, email });
  definirEtat(ETATS.connecte);
}

export async function deconnecter() {
  if (!client) return;
  deconnexionVolontaire = true;
  try {
    await client.auth.signOut({ scope: 'local' });
  } finally {
    deconnexionVolontaire = false;
    definirEtat(ETATS.deconnecte);
  }
}
