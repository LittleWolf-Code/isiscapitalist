// Formules et formatage du client : fonctions PURES, mêmes noms que backend/src/world-engine.ts
// pour que les deux implémentations restent comparables. Elles ne servent qu'à l'AFFICHAGE
// (coût sur le bouton Acheter, gain d'une production) : le serveur reste seul juge (D14).
import { Palier, Product, World } from './graphql';

// Coût total de q exemplaires (GAME-RULES.md §Achat de produits) : suite géométrique de raison
// g = croissance à partir de c = cout (prix du prochain exemplaire) ; c * q si g === 1.
export function buyCost(
  product: Pick<Product, 'cout' | 'croissance'>,
  q: number,
): number {
  const c = product.cout;
  const g = product.croissance;
  if (g === 1) {
    return c * q;
  }
  return (c * (Math.pow(g, q) - 1)) / (g - 1);
}

// Plus grand nombre d'exemplaires payables avec `money` (mode d'achat « max ») : inverse de buyCost,
// q = floor(log(1 + money × (g − 1) / c) / log g), ou floor(money / c) si g === 1. L'arrondi flottant
// de log() peut se tromper d'une unité dans les deux sens (q dont buyCost dépasse money de 1e-12,
// que le serveur refuserait ; ou q + 1 encore payable) : le résultat est corrigé contre buyCost,
// la formule que le serveur applique (`money < total` strict).
export function maxAffordable(
  product: Pick<Product, 'cout' | 'croissance'>,
  money: number,
): number {
  const c = product.cout;
  const g = product.croissance;
  if (!(money > 0) || !(c > 0)) {
    return 0;
  }
  let q =
    g === 1
      ? Math.floor(money / c)
      : Math.floor(Math.log(1 + (money * (g - 1)) / c) / Math.log(g));
  while (q > 0 && buyCost(product, q) > money) {
    q--;
  }
  while (buyCost(product, q + 1) <= money) {
    q++;
  }
  return q;
}

// Gain d'une production terminée (GAME-RULES.md §Production) : quantite × revenu, majoré du
// bonus des anges actifs (angelbonus en % par ange).
export function productionGain(
  world: Pick<World, 'activeangels' | 'angelbonus'>,
  product: Pick<Product, 'quantite' | 'revenu'>,
): number {
  return (
    product.quantite *
    product.revenu *
    (1 + (world.activeangels * world.angelbonus) / 100)
  );
}

// Suffixes SI par tranche de 1000 : k (10³), M (10⁶), G (10⁹), T (10¹²), P (10¹⁵), E (10¹⁸),
// Z (10²¹), Y (10²⁴). Au-delà (10²⁷ et plus) on passe en notation scientifique : les coûts
// croissent géométriquement et un suffixe de plus ne ferait que reculer le problème, alors que
// « 1.23e30 » reste court quel que soit l'ordre de grandeur (D29).
const UNITS = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

// 2 décimales en dessous de 1000, puis « 1.23 k », « 1.23 M »… jusqu'à « 999.99 Y », puis
// « 1.23e27 » (toExponential(2), sans le « + » de « 1.23e+27 »). Point décimal fixe (pas de
// locale) : les valeurs attendues des tests et de la roadmap sont écrites ainsi. Le résultat reste
// court (≤ 8 caractères hors signe) : le bouton Acheter compte dessus pour tenir sur une seule
// ligne (D29).
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const sign = value < 0 ? '-' : '';
  let abs = Math.abs(value);
  let unit = 0;
  while (abs >= 1000 && unit < UNITS.length - 1) {
    abs /= 1000;
    unit++;
  }
  if (abs >= 1000) {
    // Au-delà du dernier suffixe : mantisse et exposant de la valeur d'origine.
    return sign + Math.abs(value).toExponential(2).replace('e+', 'e');
  }
  const text = abs.toFixed(2);
  return sign + text + (UNITS[unit] ? ' ' + UNITS[unit] : '');
}

// Cycle « trop rapide » pour une barre de production lisible : 4 × le tick de 100 ms de
// GameService (D15). En dessous, la barre n'aurait qu'un à trois pas par cycle, et le repliement
// entre le tick et la vitesse la ferait paraître stroboscopique ou reculer ; on la montre pleine
// en continu, comme AdVenture Capitalist pour ses business trop rapides (D29).
export const FAST_CYCLE_MS = 400;

// Progression de la barre de production en % (mat-progress-bar attend 0-100) : timeleft décroît,
// la barre se remplit. 0 si vitesse ≤ 0 (garde-fou), 100 si le cycle est plus court que
// FAST_CYCLE_MS (barre pleine), sinon 100 × (vitesse − timeleft) / vitesse borné à 0-100 (au
// repos, timeleft = 0 → 100).
export function productionProgress(
  product: Pick<Product, 'vitesse' | 'timeleft'>,
): number {
  const { vitesse, timeleft } = product;
  if (vitesse <= 0) return 0;
  if (vitesse < FAST_CYCLE_MS) return 100;
  return Math.min(100, Math.max(0, (100 * (vitesse - timeleft)) / vitesse));
}

// Durée en ms → « mm:ss », ou « h:mm:ss » à partir d'une heure ; arrondie à la seconde
// SUPÉRIEURE : une production en cours n'affiche jamais 00:00 alors que sa barre n'est pas
// pleine. Valeurs négatives ou non finies → « 00:00 » (même garde-fou que formatNumber).
// Affichage seulement (chrono de la carte produit, D28).
export function formatDuration(ms: number): string {
  const s = Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 1000) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  return h > 0 ? h + ':' + mmss : mmss;
}


// Score nécessaire par ange gagné : « 2 % du score », soit 1 ange pour 50 de score (D20). Même
// constante que backend/src/world-engine.ts ; division par 50 (exacte en IEEE 754 pour un
// multiple de 50) plutôt que multiplication par 0.02.
export const SCORE_PER_ANGEL = 50;

// Anges que rapporterait un reset maintenant (GAME-RULES.md §Reset, même formule que
// backend/src/world-engine.ts, D20) : floor(score / SCORE_PER_ANGEL) donne le total « mérité »
// depuis le début, moins ce qui a déjà été distribué (totalangels), borné à 0. Affichage
// seulement (badge de l'onglet Anges, panneau Reset) : le serveur recalcule au reset (D19).
export function angelsEarned(
  world: Pick<World, 'score' | 'totalangels'>,
): number {
  return Math.max(
    0,
    Math.floor(world.score / SCORE_PER_ANGEL) - world.totalangels,
  );
}

// Prochain palier à atteindre : le palier VERROUILLÉ de plus petit seuil, ou null si tout est
// débloqué (ou si le produit n'a aucun palier). On cherche le minimum plutôt que « le premier
// verrouillé du tableau » : origworld les liste en ordre croissant mais rien ne le garantit dans
// un userworlds/*.json édité à la main, et le backend teste chaque palier indépendamment
// (GAME-RULES.md §Unlocks). À seuil égal, le premier du tableau gagne (comparaison stricte).
// Une seule définition, partagée par ProductCard (barre d'achat) et UnlockList (D23).
export function nextUnlock<P extends Pick<Palier, 'seuil' | 'unlocked'>>(
  product: { paliers: readonly P[] },
): P | null {
  let next: P | null = null;
  for (const palier of product.paliers) {
    if (!palier.unlocked && (next === null || palier.seuil < next.seuil)) {
      next = palier;
    }
  }
  return next;
}

// Managers dont l'engagement serait refusé par le serveur (D24) : managers non possédés
// (`unlocked: false`) dont le produit cible (`idcible`) n'a aucun exemplaire. Sert à griser le
// bouton Engager de la liste Managers ; un manager déjà possédé est déjà grisé par PalierList
// (`palier.unlocked`), on ne le liste pas. Un `idcible` sans produit correspondant est ignoré.
export function blockedManagerNames(
  world: {
    managers: readonly Pick<Palier, 'name' | 'idcible' | 'unlocked'>[];
    products: readonly Pick<Product, 'id' | 'quantite'>[];
  },
): string[] {
  return world.managers
    .filter((manager) => {
      if (manager.unlocked) {
        return false;
      }
      const product = world.products.find((p) => p.id === manager.idcible);
      return product !== undefined && product.quantite === 0;
    })
    .map((manager) => manager.name);
}

// Cible d'un palier en toutes lettres (GAME-RULES.md §Vocabulaire / §Unlocks) pour la colonne
// « produit » de PalierList (D32) : `idcible` 0 → « Global » (tous les produits), -1 → « Anges »
// (le monde lui-même), sinon le nom du produit visé, ou « #id » si aucun produit ne porte cet id
// (fichier userworlds édité à la main, liste montée sans produits) : l'id brut n'est plus
// affiché ailleurs.
export function targetLabel(
  palier: Pick<Palier, 'idcible'>,
  products: readonly Pick<Product, 'id' | 'name'>[],
): string {
  if (palier.idcible === 0) return 'Global';
  if (palier.idcible === -1) return 'Anges';
  const product = products.find((p) => p.id === palier.idcible);
  return product ? product.name : `#${palier.idcible}`;
}

// Chemins d'image à essayer dans l'ordre pour illustrer un palier (D32) : son `logo`, puis un
// repli tiré de sa cible — logo du produit visé si `idcible > 0` (et trouvé), logo du monde si
// `idcible === 0`, rien pour -1 (anges). Les chaînes vides sont écartées (un palier sans logo
// passe directement au repli, aucune requête vers la racine du backend) et les doublons retirés
// (dans origworld les upgrades portent déjà le logo de leur produit). GameIcon consomme la liste
// et passe au suivant sur l'événement `error` de l'<img>.
export function logoCandidates(
  palier: Pick<Palier, 'logo' | 'idcible'>,
  products: readonly Pick<Product, 'id' | 'logo'>[],
  worldLogo: string,
): readonly string[] {
  let fallback: string | undefined;
  if (palier.idcible > 0) {
    fallback = products.find((p) => p.id === palier.idcible)?.logo;
  } else if (palier.idcible === 0) {
    fallback = worldLogo;
  }
  const candidates: string[] = [];
  for (const path of [palier.logo, fallback]) {
    if (path && !candidates.includes(path)) {
      candidates.push(path);
    }
  }
  return candidates;
}
