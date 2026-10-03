import { TYPES_REPAS } from '../config/defauts.js';
import { dateLocaleISO } from '../domaine/dates.js';

export const VERSION_SCHEMA = 1;

// Sauvegarde complète : toutes les lignes des deux tables, telles qu'en base.
export function genererJSON({ repas, objectifs }) {
  return JSON.stringify({
    exporte_le: new Date().toISOString(),
    version_schema: VERSION_SCHEMA,
    repas,
    objectifs,
  }, null, 2);
}

const nombreCSV = (valeur) => String(Number(valeur)).replace('.', ',');

// Un champ contenant le séparateur, des guillemets ou un retour à la ligne est entouré de guillemets.
function champCSV(valeur) {
  const texte = String(valeur ?? '');
  return /[;"\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

// Repas pour un tableur : séparateur « ; », décimales à virgule, date et heure locales.
// Le BOM UTF-8 en tête permet à Excel et Numbers de reconnaître les accents.
export function genererCSV(repas) {
  const entete = ['Date', 'Heure', 'Type', 'Repas', 'Calories (kcal)', 'Protéines (g)', 'Glucides (g)', 'Lipides (g)'];
  const lignes = repas.map((un) => {
    const prisLe = new Date(un.pris_le);
    const heure = `${String(prisLe.getHours()).padStart(2, '0')}:${String(prisLe.getMinutes()).padStart(2, '0')}`;
    return [
      dateLocaleISO(prisLe),
      heure,
      TYPES_REPAS[un.type_repas] ?? '',
      un.nom,
      nombreCSV(un.calories),
      nombreCSV(un.proteines),
      nombreCSV(un.glucides),
      nombreCSV(un.lipides),
    ];
  });
  return `﻿${[entete, ...lignes].map((ligne) => ligne.map(champCSV).join(';')).join('\r\n')}\r\n`;
}

export function nomFichier(extension) {
  return `mica-export-${dateLocaleISO()}.${extension}`;
}

// Téléchargement via un lien temporaire vers un Blob. Sur iOS, Safari propose alors d'enregistrer
// le fichier (Fichiers, iCloud Drive) ou de l'ouvrir dans une autre app.
export function telecharger(contenu, nom, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
