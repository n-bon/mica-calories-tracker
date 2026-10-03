// Chaque champ « nom » a une zone d'erreur #erreur-nom, et chaque formulaire une zone de message .message.

export function afficherErreurChamp(formulaire, nom, texte) {
  const zone = document.getElementById(`erreur-${nom}`);
  zone.querySelector('.champ__erreur-texte').textContent = texte;
  zone.hidden = false;
  formulaire.elements[nom].setAttribute('aria-invalid', 'true');
}

export function effacerErreurs(formulaire, noms) {
  noms.forEach((nom) => {
    document.getElementById(`erreur-${nom}`).hidden = true;
    formulaire.elements[nom].removeAttribute('aria-invalid');
  });
  formulaire.querySelector('.message').hidden = true;
}

export function afficherMessage(formulaire, type, texte) {
  const message = formulaire.querySelector('.message');
  message.classList.toggle('message--succes', type === 'succes');
  message.classList.toggle('message--erreur', type === 'erreur');
  message.querySelector('.message__symbole').textContent = type === 'succes' ? '✓' : '!';
  message.querySelector('.message__texte').textContent = texte;
  message.hidden = false;
}
