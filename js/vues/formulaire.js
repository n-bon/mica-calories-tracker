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

export function messageErreurSupabase(erreur, action, table) {
  if (!navigator.onLine || /fetch/i.test(erreur.message)) {
    return `${action} impossible : Supabase injoignable. Vérifier la connexion internet, puis réessayer.`;
  }
  if (erreur.code === 'PGRST301' || erreur.code === 'PGRST303' || erreur.code === '42501') {
    return `${action} impossible : session expirée. Saisir à nouveau le mot de passe dans Réglages → Connexion.`;
  }
  if (erreur.code === '42P01' || erreur.code === 'PGRST205') {
    return `${action} impossible : table ${table} introuvable. Exécuter sql/schema.sql dans l’éditeur SQL de Supabase.`;
  }
  return `${action} impossible : ${erreur.message}`;
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
