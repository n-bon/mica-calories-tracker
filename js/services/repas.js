import { bornesUTC } from '../domaine/dates.js';
import { obtenirClient } from './supabase.js';

// Supabase renvoie au plus 1000 lignes par requête : on lit page par page jusqu'à la limite voulue.
const TAILLE_PAGE = 1000;

async function lireParPages(requete, limite = Infinity) {
  const lignes = [];
  while (lignes.length < limite) {
    const debut = lignes.length;
    const fin = Math.min(debut + TAILLE_PAGE, limite) - 1;
    const { data, error } = await requete().range(debut, fin);
    if (error) throw error;
    lignes.push(...data);
    if (data.length < fin - debut + 1) break;
  }
  return lignes;
}

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
export function lireRepasPourSuggestions() {
  return lireParPages(
    () => obtenirClient()
      .from('repas')
      .select('nom, pris_le, calories, proteines, glucides, lipides')
      .order('pris_le', { ascending: false }),
    2000,
  );
}

// Repas d'une plage de jours locaux, du plus ancien au plus récent.
export function lireRepasDePlage(plage) {
  const { depuis, avant } = bornesUTC(plage);
  return lireParPages(
    () => obtenirClient()
      .from('repas')
      .select('id, type_repas, nom, pris_le, calories, proteines, glucides, lipides')
      .gte('pris_le', depuis)
      .lt('pris_le', avant)
      .order('pris_le', { ascending: true })
      .order('id', { ascending: true }),
  );
}
