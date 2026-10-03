import { dateLocaleISO } from '../domaine/dates.js';
import { obtenirClient } from './supabase.js';

function versVersion(ligne) {
  return {
    dateEffet: ligne.date_effet,
    mode: ligne.mode,
    poidsActuel: Number(ligne.poids_actuel),
    poidsCible: Number(ligne.poids_cible),
    coefs: {
      calories: Number(ligne.coef_calories),
      proteines: Number(ligne.coef_proteines),
      glucides: Number(ligne.coef_glucides),
      lipides: Number(ligne.coef_lipides),
    },
    objectifs: {
      calories: Number(ligne.obj_calories),
      proteines: Number(ligne.obj_proteines),
      glucides: Number(ligne.obj_glucides),
      lipides: Number(ligne.obj_lipides),
    },
  };
}

// Toutes les versions de l'utilisateur connecté (la RLS filtre sur user_id), de la plus ancienne à la plus récente.
export async function lireVersions() {
  const { data, error } = await obtenirClient()
    .from('objectifs')
    .select('*')
    .order('date_effet', { ascending: true });
  if (error) throw error;
  return data.map(versVersion);
}

// Un enregistrement le même jour local remplace la version du jour ; un autre jour crée une nouvelle version.
export async function enregistrerVersion({ mode, poidsActuel, poidsCible, coefs, objectifs }) {
  const { data, error } = await obtenirClient()
    .from('objectifs')
    .upsert(
      {
        date_effet: dateLocaleISO(),
        mode,
        poids_actuel: poidsActuel,
        poids_cible: poidsCible,
        coef_calories: coefs.calories,
        coef_proteines: coefs.proteines,
        coef_glucides: coefs.glucides,
        coef_lipides: coefs.lipides,
        obj_calories: objectifs.calories,
        obj_proteines: objectifs.proteines,
        obj_glucides: objectifs.glucides,
        obj_lipides: objectifs.lipides,
      },
      { onConflict: 'user_id,date_effet' },
    )
    .select()
    .single();
  if (error) throw error;
  return versVersion(data);
}

// Toutes les lignes de la table objectifs, telles qu'en base : sauvegarde complète.
export async function lireObjectifsBruts() {
  const { data, error } = await obtenirClient()
    .from('objectifs')
    .select('*')
    .order('date_effet', { ascending: true });
  if (error) throw error;
  return data;
}
