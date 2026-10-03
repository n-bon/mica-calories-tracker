// Chaque champ « nom » désigne sa zone d'erreur (…erreur-nom) dans son aria-describedby,
// et chaque formulaire a une zone de message .message.

// Élément qui porte l'état d'erreur : le champ lui-même, ou le conteneur radiogroup d'un groupe de boutons radio.
function cibleChamp(formulaire, nom) {
  const champ = formulaire.elements[nom];
  return champ instanceof RadioNodeList ? champ[0].closest('[role="radiogroup"]') : champ;
}

export function focaliserChamp(formulaire, nom) {
  const champ = formulaire.elements[nom];
  (champ instanceof RadioNodeList ? champ[0] : champ).focus();
}

function zoneErreur(formulaire, nom) {
  const references = cibleChamp(formulaire, nom).getAttribute('aria-describedby') ?? '';
  const id = references.split(/\s+/).find((reference) => reference.endsWith(`erreur-${nom}`));
  return document.getElementById(id);
}

export function afficherErreurChamp(formulaire, nom, texte) {
  const zone = zoneErreur(formulaire, nom);
  zone.querySelector('.champ__erreur-texte').textContent = texte;
  zone.hidden = false;
  cibleChamp(formulaire, nom).setAttribute('aria-invalid', 'true');
}

export function effacerErreurs(formulaire, noms) {
  noms.forEach((nom) => {
    zoneErreur(formulaire, nom).hidden = true;
    cibleChamp(formulaire, nom).removeAttribute('aria-invalid');
  });
  formulaire.querySelector('.message').hidden = true;
}

// Affiche les erreurs de validation et place le focus sur le premier champ fautif ; renvoie true s'il y en a.
export function signalerErreurs(formulaire, noms, erreurs) {
  const enErreur = noms.filter((nom) => erreurs[nom]);
  enErreur.forEach((nom) => afficherErreurChamp(formulaire, nom, erreurs[nom]));
  if (enErreur.length > 0) focaliserChamp(formulaire, enErreur[0]);
  return enErreur.length > 0;
}

export function afficherMessage(formulaire, type, texte) {
  const message = formulaire.querySelector('.message');
  message.classList.toggle('message--succes', type === 'succes');
  message.classList.toggle('message--erreur', type === 'erreur');
  message.querySelector('.message__symbole').textContent = type === 'succes' ? '✓' : '!';
  message.querySelector('.message__texte').textContent = texte;
  message.hidden = false;
}

// Codes PostgreSQL / PostgREST regroupés par cause, pour un message compréhensible.
const CODES_SESSION = ['PGRST301', 'PGRST302', 'PGRST303', '42501'];
const CODES_TABLE = ['42P01', 'PGRST205'];
const CODES_CONTRAINTE = ['23502', '23505', '23514', '22001', '22003', '22007', '22008', '22P02'];

// Message clair pour une erreur Supabase : jamais le message technique brut.
export function messageErreurSupabase(erreur, action, table) {
  const code = erreur?.code;
  if (!navigator.onLine || /fetch|network|réseau/i.test(erreur?.message ?? '')) {
    return `${action} impossible : pas de connexion internet ou Supabase injoignable. Réessayer une fois connecté.`;
  }
  if (CODES_SESSION.includes(code) || /jwt|session/i.test(erreur?.message ?? '')) {
    return `${action} impossible : session expirée. Saisir à nouveau le mot de passe dans Réglages → Connexion.`;
  }
  if (CODES_TABLE.includes(code)) {
    return `${action} impossible : table ${table} introuvable. Exécuter sql/schema.sql dans l’éditeur SQL de Supabase.`;
  }
  if (CODES_CONTRAINTE.includes(code)) {
    return `${action} impossible : une valeur a été refusée par la base. Vérifier les champs, puis réessayer.`;
  }
  return `${action} impossible pour le moment. Réessayer dans quelques instants.`;
}

// Copie d'un fragment de HTML avec des identifiants préfixés (et les références qui les citent),
// pour réutiliser un formulaire existant sans dupliquer son HTML.
export function clonerAvecPrefixe(element, prefixe) {
  const copie = element.cloneNode(true);
  [copie, ...copie.querySelectorAll('*')].forEach((noeud) => {
    if (noeud.id) noeud.id = `${prefixe}${noeud.id}`;
    ['for', 'aria-describedby', 'aria-controls', 'aria-labelledby'].forEach((attribut) => {
      const valeur = noeud.getAttribute(attribut);
      if (valeur) noeud.setAttribute(attribut, valeur.split(/\s+/).map((id) => `${prefixe}${id}`).join(' '));
    });
  });
  return copie;
}
