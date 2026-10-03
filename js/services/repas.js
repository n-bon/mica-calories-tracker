import { obtenirClient } from './supabase.js';

// pris_le est envoyé en ISO UTC : l'instant reste exact quel que soit le fuseau de l'appareil.
export async function ajouterRepas({ typeRepas, nom, prisLe, calories, proteines, glucides, lipides }) {
  const { data, error } = await obtenirClient()
    .from('repas')
    .insert({
      type_repas: typeRepas,
      nom,
      pris_le: prisLe.toISOString(),
      calories,
      proteines,
      glucides,
      lipides,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Historique utilisé pour les suggestions de nom : les 2000 repas les plus récents.
export async function lireRepasPourSuggestions() {
  const { data, error } = await obtenirClient()
    .from('repas')
    .select('nom, pris_le, calories, proteines, glucides, lipides')
    .order('pris_le', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data;
}
