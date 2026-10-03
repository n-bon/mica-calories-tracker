import { caloriesEstimees, estIncoherent } from '../domaine/coherence-calorique.js';
import { dateHeureLocaleISO } from '../domaine/dates.js';
import { ETATS, lireEtat } from '../services/supabase.js';
import { arrondir, formaterNombre, lireNombre } from '../utils/nombres.js';
import { effacerErreurs } from './formulaire.js';
import { attacherSuggestions, chargerIndex } from './suggestions.js';

const METRIQUES = {
  calories: { unite: 'kcal', max: 10000 },
  proteines: { unite: 'g', max: 1000 },
  glucides: { unite: 'g', max: 1000 },
  lipides: { unite: 'g', max: 1000 },
};
const CHAMPS = ['typeRepas', 'nom', 'prisLe', ...Object.keys(METRIQUES)];
const NOM_MAX = 100;

const formaterValeur = (valeur) => formaterNombre(Number(valeur), 1, { groupement: false });

/**
 * Champs, validations, avertissement de cohérence et suggestions d'un formulaire de repas,
 * partagés par la saisie et la modification. preremplirMetriques : une suggestion choisie remplit
 * aussi les quatre valeurs (saisie) ou seulement le nom (modification).
 */
export function creerFormulaireRepas(formulaire, { preremplirMetriques, surChangement }) {
  const avertissement = formulaire.querySelector('.avertissement');
  const avertissementTexte = avertissement.querySelector('.avertissement__texte');
  const champ = (nom) => formulaire.elements[nom];

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
  function estComplet() {
    return Boolean(champ('typeRepas').value)
      && CHAMPS.filter((nom) => nom !== 'typeRepas').every((nom) => champ(nom).value.trim() !== '');
  }

  function rafraichir() {
    mettreAJourAvertissement();
    surChangement();
  }

  function choisirSuggestion(entree) {
    champ('nom').value = entree.nom;
    const remplis = ['nom'];
    if (preremplirMetriques) {
      Object.keys(METRIQUES).forEach((metrique) => {
        champ(metrique).value = formaterValeur(entree.valeurs[metrique]);
        remplis.push(metrique);
      });
    }
    effacerErreurs(formulaire, remplis);
    rafraichir();
  }

  const suggestions = attacherSuggestions(champ('nom'), formulaire.querySelector('.suggestions'), {
    surSelection: choisirSuggestion,
    surFocus: () => {
      if (lireEtat() === ETATS.connecte) chargerIndex();
    },
  });

  formulaire.addEventListener('input', () => {
    formulaire.querySelector('.message').hidden = true;
    rafraichir();
  });

  // Valeurs d'un repas enregistré (ligne de la table repas).
  function remplir(repas) {
    suggestions.fermer();
    formulaire.reset();
    const type = formulaire.querySelector(`[name="typeRepas"][value="${repas.type_repas}"]`);
    if (type) type.checked = true;
    champ('nom').value = repas.nom;
    champ('prisLe').value = dateHeureLocaleISO(new Date(repas.pris_le));
    Object.keys(METRIQUES).forEach((metrique) => {
      champ(metrique).value = formaterValeur(repas[metrique]);
    });
    effacerErreurs(formulaire, CHAMPS);
    rafraichir();
  }

  function reinitialiser() {
    suggestions.fermer();
    formulaire.reset();
    effacerErreurs(formulaire, CHAMPS);
    avertissement.hidden = true;
  }

  return { champs: CHAMPS, lireValeurs, valider, estComplet, remplir, reinitialiser };
}
