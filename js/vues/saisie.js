import { dateHeureLocaleISO } from '../domaine/dates.js';
import { invaliderDonneesRecap } from '../services/donnees-recap.js';
import { ajouterRepas } from '../services/repas.js';
import { ETATS, lireEtat, surChangementEtat } from '../services/supabase.js';
import { afficherMessage, effacerErreurs, messageErreurSupabase, signalerErreurs } from './formulaire.js';
import { creerFormulaireRepas } from './formulaire-repas.js';
import { chargerIndex, indexerRepas, viderIndex } from './suggestions.js';

const formulaire = document.getElementById('formulaire-saisie');
const bouton = document.getElementById('bouton-enregistrer-repas');
const aideBouton = document.getElementById('aide-enregistrer-repas');

let repas = null;
let envoiEnCours = false;
let dateModifiee = false;

function mettreAJourBouton() {
  const connecte = lireEtat() === ETATS.connecte;
  const complet = repas.estComplet();
  bouton.disabled = !connecte || !complet || envoiEnCours;
  aideBouton.hidden = connecte && complet;
  aideBouton.textContent = connecte
    ? 'Renseigner tous les champs pour enregistrer.'
    : 'Connexion requise pour enregistrer : renseigner Réglages → Connexion.';
}

function surChangementConnexion() {
  mettreAJourBouton();
  if (lireEtat() === ETATS.connecte) {
    chargerIndex();
  } else {
    viderIndex();
  }
}

function initialiserDate() {
  formulaire.elements.prisLe.value = dateHeureLocaleISO();
  dateModifiee = false;
}

async function enregistrer(evenement) {
  evenement.preventDefault();
  effacerErreurs(formulaire, repas.champs);

  const valeurs = repas.lireValeurs();
  if (signalerErreurs(formulaire, repas.champs, repas.valider(valeurs))) return;

  envoiEnCours = true;
  mettreAJourBouton();
  bouton.textContent = 'Enregistrement…';
  try {
    indexerRepas(await ajouterRepas(valeurs));
    invaliderDonneesRecap();
    repas.reinitialiser();
    initialiserDate();
    afficherMessage(formulaire, 'succes', 'Repas enregistré.');
  } catch (erreur) {
    afficherMessage(formulaire, 'erreur', messageErreurSupabase(erreur, 'Enregistrement', 'repas'));
  } finally {
    envoiEnCours = false;
    bouton.textContent = 'Enregistrer';
    mettreAJourBouton();
  }
}

// À chaque ouverture de l'onglet, la date suit l'heure courante tant qu'elle n'a pas été modifiée à la main.
export function afficherSaisie() {
  if (!dateModifiee) initialiserDate();
}

export function initialiserSaisie() {
  repas = creerFormulaireRepas(formulaire, { preremplirMetriques: true, surChangement: mettreAJourBouton });
  initialiserDate();
  formulaire.addEventListener('submit', enregistrer);
  formulaire.addEventListener('input', ({ target }) => {
    if (target.name === 'prisLe') dateModifiee = true;
  });
  surChangementEtat(surChangementConnexion);
}
