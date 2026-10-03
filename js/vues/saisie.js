import { caloriesEstimees, estIncoherent } from '../domaine/coherence-calorique.js';
import { dateHeureLocaleISO } from '../domaine/dates.js';
import { ajouterRepas } from '../services/repas.js';
import { ETATS, lireEtat, surChangementEtat } from '../services/supabase.js';
import { arrondir, formaterNombre, lireNombre } from '../utils/nombres.js';
import {
  afficherMessage,
  effacerErreurs,
  messageErreurSupabase,
  signalerErreurs,
} from './formulaire.js';
import { attacherSuggestions, chargerIndex, indexerRepas, viderIndex } from './suggestions.js';

const METRIQUES = {
  calories: { unite: 'kcal', max: 10000 },
  proteines: { unite: 'g', max: 1000 },
  glucides: { unite: 'g', max: 1000 },
  lipides: { unite: 'g', max: 1000 },
};
const CHAMPS = ['typeRepas', 'nom', 'prisLe', ...Object.keys(METRIQUES)];
const NOM_MAX = 100;

const formulaire = document.getElementById('formulaire-saisie');
const bouton = document.getElementById('bouton-enregistrer-repas');
const aideBouton = document.getElementById('aide-enregistrer-repas');
const avertissement = document.getElementById('avertissement-coherence');
const avertissementTexte = avertissement.querySelector('.avertissement__texte');

let envoiEnCours = false;
let dateModifiee = false;
let suggestions = null;

function champ(nom) {
  return formulaire.elements[nom];
}

function lireValeurs() {
  const valeurs = {
    typeRepas: champ('typeRepas').value,
    nom: champ('nom').value.trim(),
    prisLe: champ('prisLe').value ? new Date(champ('prisLe').value) : null,
  };
  Object.keys(METRIQUES).forEach((metrique) => {
    valeurs[metrique] = arrondir(lireNombre(champ(metrique).value), 1);
  });
  return valeurs;
}

function valider(valeurs) {
  const erreurs = {};
  if (!valeurs.typeRepas) erreurs.typeRepas = 'Choisir le type de repas.';
  if (!valeurs.nom) {
    erreurs.nom = 'Saisir le nom du repas.';
  } else if (valeurs.nom.length > NOM_MAX) {
    erreurs.nom = `Nom trop long : ${NOM_MAX} caractères maximum.`;
  }
  if (!valeurs.prisLe || Number.isNaN(valeurs.prisLe.getTime())) {
    erreurs.prisLe = 'Saisir la date et l’heure du repas.';
  }
  Object.entries(METRIQUES).forEach(([metrique, { unite, max }]) => {
    const valeur = valeurs[metrique];
    if (Number.isNaN(valeur)) {
      erreurs[metrique] = 'Saisir un nombre positif ou 0, par exemple 12,5.';
    } else if (valeur > max) {
      erreurs[metrique] = `Valeur trop élevée : ${formaterNombre(max)} ${unite} maximum.`;
    }
  });
  return erreurs;
}

// Avertissement non bloquant, affiché dès que les quatre valeurs sont valides.
function mettreAJourAvertissement() {
  const { calories, proteines, glucides, lipides } = lireValeurs();
  const complet = [calories, proteines, glucides, lipides].every((valeur) => !Number.isNaN(valeur));
  const incoherent = complet && estIncoherent(calories, { proteines, glucides, lipides });
  avertissement.hidden = !incoherent;
  if (incoherent) {
    const estimation = formaterNombre(caloriesEstimees({ proteines, glucides, lipides }), 0);
    avertissementTexte.textContent = `Les calories saisies (${formaterNombre(calories)} kcal) s’écartent de plus de 15 % de l’estimation tirée des macronutriments (${estimation} kcal). Vérifier les valeurs : l’enregistrement reste possible.`;
  }
}

// Tous les champs doivent être renseignés ; la validité des valeurs est contrôlée à l'envoi.
function formulaireComplet() {
  return Boolean(champ('typeRepas').value)
    && CHAMPS.filter((nom) => nom !== 'typeRepas').every((nom) => champ(nom).value.trim() !== '');
}

function mettreAJourBouton() {
  const connecte = lireEtat() === ETATS.connecte;
  const complet = formulaireComplet();
  bouton.disabled = !connecte || !complet || envoiEnCours;
  aideBouton.hidden = connecte && complet;
  aideBouton.textContent = connecte
    ? 'Renseigner tous les champs pour enregistrer.'
    : 'Connexion requise pour enregistrer : renseigner Réglages → Connexion.';
}

// Sélection d'une suggestion : nom et quatre métriques de la saisie la plus récente, modifiables ensuite.
function preremplir(entree) {
  champ('nom').value = entree.nom;
  Object.keys(METRIQUES).forEach((metrique) => {
    champ(metrique).value = formaterNombre(entree.valeurs[metrique], 1, { groupement: false });
  });
  effacerErreurs(formulaire, ['nom', ...Object.keys(METRIQUES)]);
  mettreAJourAvertissement();
  mettreAJourBouton();
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
  champ('prisLe').value = dateHeureLocaleISO();
  dateModifiee = false;
}

function reinitialiser() {
  suggestions.fermer();
  formulaire.reset();
  initialiserDate();
  effacerErreurs(formulaire, CHAMPS);
  avertissement.hidden = true;
}

async function enregistrer(evenement) {
  evenement.preventDefault();
  effacerErreurs(formulaire, CHAMPS);

  const valeurs = lireValeurs();
  if (signalerErreurs(formulaire, CHAMPS, valider(valeurs))) return;

  envoiEnCours = true;
  mettreAJourBouton();
  bouton.textContent = 'Enregistrement…';
  try {
    indexerRepas(await ajouterRepas(valeurs));
    reinitialiser();
    afficherMessage(formulaire, 'succes', 'Repas enregistré.');
  } catch (erreur) {
    afficherMessage(formulaire, 'erreur', messageErreurSupabase(erreur, 'Enregistrement', 'repas'));
  } finally {
    envoiEnCours = false;
    bouton.textContent = 'Enregistrer';
    mettreAJourBouton();
  }
}

function surSaisie(evenement) {
  if (evenement.target.name === 'prisLe') dateModifiee = true;
  formulaire.querySelector('.message').hidden = true;
  mettreAJourAvertissement();
  mettreAJourBouton();
}

// À chaque ouverture de l'onglet, la date suit l'heure courante tant qu'elle n'a pas été modifiée à la main.
export function afficherSaisie() {
  if (!dateModifiee) initialiserDate();
}

export function initialiserSaisie() {
  initialiserDate();
  formulaire.addEventListener('submit', enregistrer);
  formulaire.addEventListener('input', surSaisie);
  suggestions = attacherSuggestions(champ('nom'), document.getElementById('suggestions-nom'), {
    surSelection: preremplir,
    surFocus: () => {
      if (lireEtat() === ETATS.connecte) chargerIndex();
    },
  });
  surChangementEtat(surChangementConnexion);
}
