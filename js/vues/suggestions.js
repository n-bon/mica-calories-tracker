import { ajouterAuIndex, chercherSuggestions, creerIndex } from '../domaine/suggestions.js';
import { lireRepasPourSuggestions } from '../services/repas.js';
import { formaterNombre } from '../utils/nombres.js';

/* Index partagé par la saisie et (plus tard) la modification des repas */

let index = creerIndex();
let indexCharge = false;

export async function chargerIndex() {
  if (indexCharge) return;
  indexCharge = true;
  try {
    index = creerIndex(await lireRepasPourSuggestions());
  } catch {
    // Sans historique, la saisie reste possible ; un nouvel essai aura lieu au prochain focus.
    indexCharge = false;
  }
}

export function viderIndex() {
  index = creerIndex();
  indexCharge = false;
}

export function indexerRepas(repas) {
  ajouterAuIndex(index, repas);
}

/* Liste de suggestions (motif combobox ARIA) */

function decrireValeurs({ calories, proteines, glucides, lipides }) {
  const g = (valeur) => formaterNombre(valeur, 1);
  return `${g(calories)} kcal · P ${g(proteines)} g · G ${g(glucides)} g · L ${g(lipides)} g`;
}

export function attacherSuggestions(champ, liste, { surSelection, surFocus }) {
  let resultats = [];
  let actif = -1;

  function fermer() {
    liste.hidden = true;
    liste.replaceChildren();
    resultats = [];
    actif = -1;
    champ.setAttribute('aria-expanded', 'false');
    champ.removeAttribute('aria-activedescendant');
  }

  function activer(position) {
    actif = position;
    [...liste.children].forEach((option, i) => {
      const estActif = i === actif;
      option.classList.toggle('suggestions__option--active', estActif);
      option.setAttribute('aria-selected', String(estActif));
      if (estActif) option.scrollIntoView({ block: 'nearest' });
    });
    if (actif >= 0) {
      champ.setAttribute('aria-activedescendant', liste.children[actif].id);
    } else {
      champ.removeAttribute('aria-activedescendant');
    }
  }

  function selectionner(position) {
    const entree = resultats[position];
    fermer();
    if (entree) surSelection(entree);
  }

  function ouvrir() {
    resultats = chercherSuggestions(index, champ.value);
    if (resultats.length === 0) {
      fermer();
      return;
    }
    const options = resultats.map((entree, i) => {
      const option = document.createElement('li');
      option.id = `${liste.id}-${i}`;
      option.className = 'suggestions__option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');

      const nom = document.createElement('span');
      nom.className = 'suggestions__nom';
      nom.textContent = entree.nom;
      const valeurs = document.createElement('span');
      valeurs.className = 'suggestions__valeurs';
      valeurs.textContent = decrireValeurs(entree.valeurs);
      option.append(nom, valeurs);

      // Empêche le champ de perdre le focus (et la liste de se fermer) avant le clic.
      option.addEventListener('mousedown', (evenement) => evenement.preventDefault());
      option.addEventListener('click', () => selectionner(i));
      return option;
    });
    liste.replaceChildren(...options);
    liste.hidden = false;
    actif = -1;
    champ.setAttribute('aria-expanded', 'true');
    champ.removeAttribute('aria-activedescendant');
  }

  champ.addEventListener('input', ouvrir);
  champ.addEventListener('focus', () => surFocus?.());
  champ.addEventListener('blur', fermer);
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      if (liste.hidden) {
        ouvrir();
        if (liste.hidden) return;
      }
      const dernier = resultats.length - 1;
      if (evenement.key === 'ArrowDown') {
        activer(actif >= dernier ? 0 : actif + 1);
      } else {
        activer(actif <= 0 ? dernier : actif - 1);
      }
    } else if (evenement.key === 'Enter' && !liste.hidden && actif >= 0) {
      evenement.preventDefault();
      selectionner(actif);
    } else if (evenement.key === 'Escape' && !liste.hidden) {
      evenement.preventDefault();
      fermer();
    }
  });

  return { fermer };
}
