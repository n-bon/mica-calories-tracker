import { nombreDeJours } from '../domaine/dates.js';

const SVG = 'http://www.w3.org/2000/svg';

// Repère fixe du dessin (unités du viewBox) : une petite courbe discrète, sans axes ni graduations.
const LARGEUR = 120;
const HAUTEUR = 32;
const MARGE = 3;
const RAYON_POINT = 1.5;

const formatDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function element(nom, attributs = {}, classe = '') {
  const noeud = document.createElementNS(SVG, nom);
  Object.entries(attributs).forEach(([cle, valeur]) => noeud.setAttribute(cle, String(valeur)));
  if (classe) noeud.setAttribute('class', classe);
  return noeud;
}

// Coupe la série en segments continus : un jour sans valeur interrompt la ligne (sauf si relierTout).
function segments(points, relierTout) {
  const resultat = [];
  points.forEach((point, i) => {
    const precedent = points[i - 1];
    const continu = precedent && (relierTout || nombreDeJours({ debut: precedent.date, fin: point.date }) === 2);
    if (continu) resultat.at(-1).push(point);
    else resultat.push([point]);
  });
  return resultat;
}

function resume({ titre, serie, domaineDates, formaterValeur }) {
  const periode = `du ${formatDate.format(domaineDates.debut)} au ${formatDate.format(domaineDates.fin)}`;
  if (serie.length === 0) return `${titre} ${periode} : aucune donnée.`;
  const valeurs = serie.map(({ valeur }) => valeur);
  return `${titre} ${periode} : première valeur ${formaterValeur(valeurs[0])}, dernière ${formaterValeur(valeurs.at(-1))}, `
    + `minimum ${formaterValeur(Math.min(...valeurs))}, maximum ${formaterValeur(Math.max(...valeurs))}.`;
}

/**
 * Dessine une petite courbe dans conteneur (remplace son contenu).
 * serie : [{ date, valeur }] ; domaineDates : { debut, fin } ; domaineValeurs : { min, max } ;
 * relierTout : relie les points même espacés de plusieurs jours (sinon un jour manquant interrompt la ligne).
 * Aucun style en attribut : traits et couleurs viennent des classes .graphique__… de styles.css.
 */
export function dessinerGraphique(conteneur, {
  titre,
  serie,
  domaineDates,
  domaineValeurs,
  relierTout = false,
  formaterValeur = String,
}) {
  const largeurUtile = LARGEUR - 2 * MARGE;
  const hauteurUtile = HAUTEUR - 2 * MARGE;
  const duree = domaineDates.fin - domaineDates.debut;
  const etendue = domaineValeurs.max - domaineValeurs.min;
  const x = (date) => MARGE + (duree > 0 ? ((date - domaineDates.debut) / duree) * largeurUtile : largeurUtile / 2);
  const y = (valeur) => MARGE + (etendue > 0 ? ((domaineValeurs.max - valeur) / etendue) * hauteurUtile : hauteurUtile / 2);

  const svg = element('svg', { viewBox: `0 0 ${LARGEUR} ${HAUTEUR}`, role: 'img' }, 'graphique');
  svg.setAttribute('aria-label', resume({ titre, serie, domaineDates, formaterValeur }));

  const points = [...serie].sort((a, b) => a.date - b.date);
  segments(points, relierTout).forEach((segment) => {
    if (segment.length > 1) {
      const coordonnees = segment.map(({ date, valeur }) => `${x(date).toFixed(1)},${y(valeur).toFixed(1)}`).join(' ');
      svg.append(element('polyline', { points: coordonnees }, 'graphique__ligne'));
    } else {
      // Point isolé : sans voisin, il n'aurait pas de trait.
      const [{ date, valeur }] = segment;
      svg.append(element('circle', { cx: x(date).toFixed(1), cy: y(valeur).toFixed(1), r: RAYON_POINT }, 'graphique__point'));
    }
  });

  conteneur.replaceChildren(svg);
}
