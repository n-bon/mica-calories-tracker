import { invaliderDonneesRecap } from '../services/donnees-recap.js';
import { modifierRepas, supprimerRepas } from '../services/repas.js';
import { estEnLigne, surChangementReseau } from '../services/reseau.js';
import { ETATS, lireEtat, surChangementEtat } from '../services/supabase.js';
import {
  afficherMessage,
  clonerAvecPrefixe,
  effacerErreurs,
  messageErreurSupabase,
  signalerErreurs,
} from './formulaire.js';
import { creerFormulaireRepas } from './formulaire-repas.js';
import { chargerIndex, viderIndex } from './suggestions.js';

const panneau = document.getElementById('edition-repas');
const boutonEnregistrer = document.getElementById('edition-enregistrer');
const boutonSupprimer = document.getElementById('edition-supprimer');
const confirmation = document.getElementById('confirmation-suppression');
const texteConfirmation = document.getElementById('confirmation-texte');
const boutonConfirmer = document.getElementById('confirmation-supprimer');

const formatDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

let formulaire = null;
let champsRepas = null;
let repasEdite = null;
let envoiEnCours = false;
let resultat = null;
let surFermeture = null;

function mettreAJourBoutons() {
  const actif = lireEtat() === ETATS.connecte && estEnLigne() && !envoiEnCours;
  boutonEnregistrer.disabled = !actif || !champsRepas.estComplet();
  boutonSupprimer.disabled = !actif;
  boutonConfirmer.disabled = !actif;
}

// Une modification ou une suppression change les suggestions et les données de Récap.
function apresChangement() {
  invaliderDonneesRecap();
  viderIndex();
  chargerIndex();
}

async function envoyer(action) {
  envoiEnCours = true;
  mettreAJourBoutons();
  try {
    await action();
  } finally {
    envoiEnCours = false;
    mettreAJourBoutons();
  }
}

async function enregistrer(evenement) {
  evenement.preventDefault();
  effacerErreurs(formulaire, champsRepas.champs);
  const valeurs = champsRepas.lireValeurs();
  if (signalerErreurs(formulaire, champsRepas.champs, champsRepas.valider(valeurs))) return;

  boutonEnregistrer.textContent = 'Enregistrement…';
  await envoyer(async () => {
    try {
      const repas = await modifierRepas(repasEdite.id, valeurs);
      apresChangement();
      resultat = { action: 'modifie', repas };
      panneau.close();
    } catch (erreur) {
      afficherMessage(formulaire, 'erreur', messageErreurSupabase(erreur, 'Modification', 'repas'));
    }
  });
  boutonEnregistrer.textContent = 'Enregistrer les modifications';
}

function demanderSuppression() {
  const date = new Date(repasEdite.pris_le);
  texteConfirmation.textContent = `Supprimer « ${repasEdite.nom} » du ${formatDate.format(date)} à ${formatHeure.format(date)} ? Cette action est définitive.`;
  confirmation.showModal();
}

async function supprimer() {
  await envoyer(async () => {
    try {
      await supprimerRepas(repasEdite.id);
      apresChangement();
      resultat = { action: 'supprime' };
      confirmation.close();
      panneau.close();
    } catch (erreur) {
      confirmation.close();
      afficherMessage(formulaire, 'erreur', messageErreurSupabase(erreur, 'Suppression', 'repas'));
    }
  });
}

// surFermeture(resultat) est appelé à la fermeture : null, { action: 'modifie', repas } ou { action: 'supprime' }.
export function ouvrirEdition(repas, rappel) {
  repasEdite = repas;
  surFermeture = rappel;
  resultat = null;
  champsRepas.remplir(repas);
  mettreAJourBoutons();
  panneau.showModal();
}

function fermerAuToucherDuVoile(dialogue) {
  // Un toucher sur le voile (hors du contenu) a pour cible le <dialog> lui-même.
  dialogue.addEventListener('click', ({ target }) => {
    if (target === dialogue) dialogue.close();
  });
}

export function initialiserEdition() {
  // Le panneau réutilise le formulaire de saisie (copie aux identifiants préfixés), sans son pied.
  formulaire = clonerAvecPrefixe(document.getElementById('formulaire-saisie'), 'edition-');
  formulaire.querySelector('.saisie__pied').remove();
  document.getElementById('edition-contenu').append(formulaire);
  champsRepas = creerFormulaireRepas(formulaire, { preremplirMetriques: false, surChangement: mettreAJourBoutons });

  formulaire.addEventListener('submit', enregistrer);
  boutonSupprimer.addEventListener('click', demanderSuppression);
  document.getElementById('edition-annuler').addEventListener('click', () => panneau.close());
  boutonConfirmer.addEventListener('click', supprimer);
  document.getElementById('confirmation-annuler').addEventListener('click', () => confirmation.close());
  fermerAuToucherDuVoile(panneau);
  fermerAuToucherDuVoile(confirmation);
  confirmation.addEventListener('close', () => {
    if (panneau.open) boutonSupprimer.focus();
  });
  panneau.addEventListener('close', () => surFermeture?.(resultat));
  surChangementEtat(mettreAJourBoutons);
  surChangementReseau(mettreAJourBoutons);
}
