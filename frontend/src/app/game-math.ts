// Règles du jeu côté client : fonctions PURES, mêmes noms et mêmes formules que
// backend/src/world-engine.ts. Le client est autonome (F-11, F-12, D36) : il fait évoluer son
// monde avec ces fonctions entre deux chargements, le serveur refait les mêmes calculs et fait foi
// au rechargement (NF-03). Les fonctions qui transforment le monde sont IMMUABLES (nouvel objet,
// jamais de mutation) : le monde est un signal, une mutation en place ne notifierait personne.
import { GetWorldQueryData, Palier, PalierFieldsFragment, Product, RatioType, World } from './graphql';

// Types tels que retournés par getWorld (sous-ensemble structurel de World / Product / Palier).
export type WorldData = NonNullable<GetWorldQueryData['getWorld']>;
export type ProductData = WorldData['products'][number];
export type PalierData = PalierFieldsFragment;

// Coût total de q exemplaires (RG-01) : suite géométrique de raison g = croissance à partir de
// c = cout (prix du prochain exemplaire) ; c * q si g === 1.
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

// Plus grand nombre d'exemplaires payables avec `money` (mode d'achat « max », `maxCanBuy` de
// F-14) : inverse de buyCost, q = floor(log(1 + money × (g − 1) / c) / log g), ou floor(money / c)
// si g === 1. L'arrondi flottant de log() peut se tromper d'une unité dans les deux sens : le
// résultat est corrigé contre buyCost, la formule que le serveur applique (`money < total` strict).
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

// Gain d'une production terminée (RG-02) : quantite × revenu, majoré du bonus des anges actifs
// (angelbonus en % par ange).
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

// Avancement de la production d'UN produit sur `elapsed` ms (RG-03) : nouveau `timeleft` et
// nombre de productions terminées. Copie à l'identique de backend/src/world-engine.ts (le sujet
// demande le même calcul des deux côtés). Sans manager : au plus une production (timeleft 0 =
// inactif). Avec manager : boucle, un produit inactif est considéré comme venant de démarrer.
export function advanceProduction(
  product: Pick<Product, 'timeleft' | 'vitesse' | 'managerUnlocked'>,
  elapsed: number,
): { timeleft: number; produced: number } {
  if (!product.managerUnlocked) {
    if (product.timeleft === 0) {
      return { timeleft: 0, produced: 0 };
    }
    if (product.timeleft <= elapsed) {
      return { timeleft: 0, produced: 1 };
    }
    return { timeleft: product.timeleft - elapsed, produced: 0 };
  }
  const timeleft = product.timeleft === 0 ? product.vitesse : product.timeleft;
  if (elapsed < timeleft) {
    return { timeleft: timeleft - elapsed, produced: 0 };
  }
  const remaining = elapsed - timeleft;
  return {
    timeleft: product.vitesse - (remaining % product.vitesse),
    produced: 1 + Math.floor(remaining / product.vitesse),
  };
}

// Remplace le produit `id` par `change(produit)` dans une copie du monde (aucun produit de ce nom :
// copie inchangée).
export function replaceProduct(
  world: WorldData,
  id: number,
  change: (product: ProductData) => ProductData,
): WorldData {
  return {
    ...world,
    products: world.products.map((p) => (p.id === id ? change(p) : p)),
  };
}

// Applique le bonus d'un palier (RG-07), version immuable d'applyBonus du backend. Cible :
// idcible > 0 → ce produit ; 0 → tous ; -1 → les anges. `gain` : revenu × ratio ; `vitesse` :
// vitesse ÷ ratio (jamais sous 1 ms) et une production en cours ACCÉLÈRE (temps restant ÷ ratio,
// arrondi supérieur, borné à la nouvelle vitesse) ; `ange` : angelbonus + ratio.
export function applyBonus(
  world: WorldData,
  palier: Pick<Palier, 'idcible' | 'ratio' | 'typeratio'>,
): WorldData {
  if (palier.typeratio === RatioType.Ange) {
    return { ...world, angelbonus: world.angelbonus + palier.ratio };
  }
  return {
    ...world,
    products: world.products.map((p) => {
      if (palier.idcible !== 0 && p.id !== palier.idcible) {
        return p;
      }
      if (palier.typeratio === RatioType.Gain) {
        return { ...p, revenu: p.revenu * palier.ratio };
      }
      const vitesse = Math.max(1, Math.floor(p.vitesse / palier.ratio));
      const timeleft =
        p.timeleft > 0 ? Math.min(vitesse, Math.ceil(p.timeleft / palier.ratio)) : 0;
      return { ...p, vitesse, timeleft };
    }),
  };
}

// Unlocks déclenchés par l'augmentation de quantité du produit `productId` (RG-05, RG-06, F-26) :
// paliers du produit dont le seuil est atteint, puis allunlocks atteints par TOUS les produits.
// Chaque palier débloqué passe `unlocked` et applique son bonus, dans le même ordre que le
// serveur (checkProductUnlocks puis checkAllUnlocks). Retourne le nouveau monde et les paliers
// débloqués (pour le message éphémère).
export function applyUnlocks(
  world: WorldData,
  productId: number,
): { world: WorldData; unlocked: PalierData[] } {
  const unlocked: PalierData[] = [];
  let next = world;

  const product = next.products.find((p) => p.id === productId);
  if (product) {
    const reached = product.paliers.filter(
      (palier) => !palier.unlocked && product.quantite >= palier.seuil,
    );
    if (reached.length > 0) {
      next = replaceProduct(next, productId, (p) => ({
        ...p,
        paliers: p.paliers.map((palier) =>
          reached.includes(palier) ? { ...palier, unlocked: true } : palier,
        ),
      }));
      for (const palier of reached) {
        next = applyBonus(next, palier);
        unlocked.push(palier);
      }
    }
  }

  const products = next.products;
  const reachedAll = next.allunlocks.filter(
    (palier) => !palier.unlocked && products.every((p) => p.quantite >= palier.seuil),
  );
  if (reachedAll.length > 0) {
    next = {
      ...next,
      allunlocks: next.allunlocks.map((palier) =>
        reachedAll.includes(palier) ? { ...palier, unlocked: true } : palier,
      ),
    };
    for (const palier of reachedAll) {
      next = applyBonus(next, palier);
      unlocked.push(palier);
    }
  }

  return { world: next, unlocked };
}

// Effet d'un palier en toutes lettres (F-25 : « type et quantité de bonus ») : « revenus ×3 »,
// « vitesse ×2 », « anges +1 % ».
export function bonusLabel(palier: Pick<Palier, 'ratio' | 'typeratio'>): string {
  switch (palier.typeratio) {
    case RatioType.Gain:
      return `revenus ×${palier.ratio}`;
    case RatioType.Vitesse:
      return `vitesse ×${palier.ratio}`;
    default:
      return `anges +${palier.ratio} %`;
  }
}

// Grand nombre en HTML (pipe `bigvalue`, F-09, d'après l'implémentation du sujet) : 2 décimales
// sous 1000, entier sous un million, puis 4 chiffres significatifs et une puissance de dix
// (« 1.235 × 10<sup>6</sup> »). Point décimal fixe (pas de locale). À insérer par [innerHTML] ;
// la sortie ne contient que des chiffres, « . », « - », « × » et <sup>.
export function bigValue(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < 1000) {
    return sign + abs.toFixed(2);
  }
  if (abs < 1e6) {
    return sign + abs.toFixed(0);
  }
  const [mantissa, exponent] = abs.toPrecision(4).split('e+');
  return `${sign}${mantissa} × 10<sup>${exponent}</sup>`;
}

// Durée en ms → « hh:mm:ss.d » (heures, minutes, secondes, dixièmes : pipe `second`, F-09),
// arrondie au dixième SUPÉRIEUR : une production en cours n'affiche jamais 00:00:00.0 alors que
// sa barre n'est pas pleine. Valeurs négatives ou non finies → « 00:00:00.0 ».
export function formatDuration(ms: number): string {
  const tenths = Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 100) : 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(tenths / 36_000);
  const m = Math.floor((tenths % 36_000) / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${tenths % 10}`;
}

// Cycle « trop rapide » pour une barre de production lisible : 4 × le tick de 100 ms de
// calcScore. En dessous, la barre n'aurait qu'un à trois pas par cycle et paraîtrait
// stroboscopique ; on la montre pleine en continu, comme AdVenture Capitalist (D29).
export const FAST_CYCLE_MS = 400;

// Progression de la barre de production en % (mat-progress-bar attend 0-100) : timeleft décroît,
// la barre se remplit. 0 si vitesse ≤ 0 (garde-fou), 100 si le cycle est plus court que
// FAST_CYCLE_MS, sinon 100 × (vitesse − timeleft) / vitesse borné à 0-100 ; au repos
// (timeleft = 0) la barre est vide.
export function productionProgress(
  product: Pick<Product, 'vitesse' | 'timeleft' | 'managerUnlocked'>,
): number {
  const { vitesse, timeleft } = product;
  if (vitesse <= 0) return 0;
  if (vitesse < FAST_CYCLE_MS && (timeleft > 0 || product.managerUnlocked)) return 100;
  if (timeleft <= 0) return 0;
  return Math.min(100, Math.max(0, (100 * (vitesse - timeleft)) / vitesse));
}

// Plus grand entier sérialisable par le type GraphQL `Int` : les anges sont des `Int!` (schéma
// du sujet), même plafond que le serveur.
export const MAX_INT32 = 2_147_483_647;

// Anges acquis depuis le début de la partie (RG-09) : floor(150 × √(score / 10¹⁵)), plafonné à
// MAX_INT32. Même formule que backend/src/world-engine.ts.
export function totalAngelsFor(score: number): number {
  return Math.min(MAX_INT32, Math.floor(150 * Math.sqrt(Math.max(0, score) / 1e15)));
}

// Anges SUPPLÉMENTAIRES qu'un reset rapporterait maintenant (RG-09, fenêtre Investors et badge) :
// totalAngelsFor(score) − totalangels, borné à 0. Le serveur recalcule au reset.
export function angelsEarned(
  world: Pick<World, 'score' | 'totalangels'>,
): number {
  return Math.max(0, totalAngelsFor(world.score) - world.totalangels);
}

// Nombre de paliers encore verrouillés que `balance` permet d'acheter (badges du bandeau gauche,
// F-21, F-27, F-31) : même comparaison que le serveur (`balance < seuil` → refus).
export function affordableCount(
  paliers: readonly Pick<Palier, 'seuil' | 'unlocked'>[],
  balance: number,
): number {
  return paliers.filter((p) => !p.unlocked && balance >= p.seuil).length;
}

// Prochain palier à atteindre : le palier VERROUILLÉ de plus petit seuil, ou null si tout est
// débloqué (ou si le produit n'a aucun palier). On cherche le minimum plutôt que « le premier
// verrouillé du tableau » : rien ne garantit l'ordre dans un userworlds/*.json édité à la main.
// À seuil égal, le premier du tableau gagne (comparaison stricte).
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

// Cible d'un palier en toutes lettres (colonne « produit » de PalierList, D32) : `idcible` 0 →
// « Global » (tous les produits), -1 → « Anges », sinon le nom du produit visé, ou « #id » si
// aucun produit ne porte cet id.
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
// repli tiré de sa cible — logo du produit visé si `idcible > 0`, logo du monde si
// `idcible === 0`, rien pour -1. Chaînes vides et doublons écartés. GameIcon consomme la liste
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
