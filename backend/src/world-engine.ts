// Moteur du jeu : fonctions PURES (pas d'injection Nest, pas d'accès fichier), importées par
// AppService et le resolver. Testables avec vitest sans instancier Nest (voir docs/DECISIONS.md, D10).
// Phase 3 : buyCost. Phase 4 : updateWorld. Phase 5 : applyBonus, checkProductUnlocks, checkAllUnlocks.
// Phase 6 : buyUpgrade. Phase 7 : angelsEarned, resetWorld. Phase 10 : advanceProduction,
// totalAngelsFor (conformité au sujet, D36).
import { Palier, Product, RatioType, World } from './graphql.js';
import { origworld } from './origworld.js';

// Coût total de q exemplaires d'un produit (formule « hypothèse », D7) :
// suite géométrique de raison g = croissance à partir de c = cout (prix du prochain exemplaire) :
//   total = c * (g^q - 1) / (g - 1), ou c * q si g === 1 (division par zéro sinon).
export function buyCost(product: Product, q: number): number {
  const c = product.cout;
  const g = product.croissance;
  if (g === 1) {
    return c * q;
  }
  return (c * (Math.pow(g, q) - 1)) / (g - 1);
}

// Revenu d'une production terminée (sujet, §9) : chaque exemplaire rapporte `revenu`, majoré du
// bonus des anges actifs (angelbonus en % par ange).
export function productionGain(world: World, product: Product): number {
  return (
    product.quantite *
    product.revenu *
    (1 + (world.activeangels * world.angelbonus) / 100)
  );
}

// Avancement de la production d'UN produit sur `elapsed` ms (RG-03) : nouveau `timeleft` et
// nombre de productions terminées. Fonction pure, recopiée À L'IDENTIQUE dans
// frontend/src/app/game-math.ts : le sujet demande le même calcul côté client (calcScore) et côté
// serveur (updateWorld), sinon les deux scores dérivent (D36).
export function advanceProduction(
  product: Pick<Product, 'timeleft' | 'vitesse' | 'managerUnlocked'>,
  elapsed: number,
): { timeleft: number; produced: number } {
  if (!product.managerUnlocked) {
    // Sans manager : au plus une production, lancée manuellement (timeleft 0 = inactif).
    if (product.timeleft === 0) {
      return { timeleft: 0, produced: 0 };
    }
    if (product.timeleft <= elapsed) {
      return { timeleft: 0, produced: 1 };
    }
    return { timeleft: product.timeleft - elapsed, produced: 0 };
  }
  // Avec manager : la production tourne en boucle. Un produit inactif est considéré comme
  // venant de démarrer. `n` est calculé par formule (O(1)) : une absence de plusieurs jours
  // ne doit pas déclencher une boucle de millions d'itérations.
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

// Évolution temporelle du monde (GAME-RULES.md §Évolution temporelle). Mute `world` et le retourne.
// `now` est injecté (défaut Date.now()) pour que les tests soient déterministes sans mock (D10).
// Appelée en tête de CHAQUE query/mutation, avant toute action, sinon l'argent produit entre
// deux requêtes ne serait jamais crédité.
export function updateWorld(world: World, now: number = Date.now()): World {
  // Premier accès (lastupdate 0) : rien ne s'est encore produit. elapsed négatif (horloge modifiée,
  // fichier venant d'une autre machine) : traité comme 0 plutôt que de produire des résultats absurdes.
  const elapsed =
    world.lastupdate === 0
      ? 0
      : Math.max(0, Math.floor(now - world.lastupdate));

  for (const product of world.products) {
    const { timeleft, produced } = advanceProduction(product, elapsed);
    const gain = produced * productionGain(world, product);
    world.money += gain;
    world.score += gain;
    product.timeleft = timeleft;
  }

  world.lastupdate = now;
  return world;
}

// Applique le bonus d'un palier (GAME-RULES.md §Application d'un bonus, D7). SEULE fonction qui
// modifie revenu / vitesse / angelbonus depuis un palier : réutilisée par les unlocks (phase 5),
// puis par les upgrades et angelupgrades (phase 6). Ne touche pas à `palier.unlocked`.
// Cibles : idcible > 0 → le produit d'id idcible ; 0 → tous les produits ; -1 → le monde.
// Un `ange` s'applique toujours au monde, quelle que soit la cible ; un gain/vitesse avec
// idcible -1 ne fait rien (pas de produit visé).
export function applyBonus(world: World, palier: Palier): void {
  if (palier.typeratio === RatioType.ange) {
    world.angelbonus += palier.ratio;
    return;
  }
  const targets =
    palier.idcible === 0
      ? world.products
      : world.products.filter((p) => p.id === palier.idcible);
  for (const product of targets) {
    if (palier.typeratio === RatioType.gain) {
      product.revenu *= palier.ratio;
    } else if (palier.typeratio === RatioType.vitesse) {
      // Jamais sous 1 ms (division par zéro dans updateWorld sinon). Une production en cours
      // ACCÉLÈRE (RG-07, D36) : son temps restant est divisé par le même ratio, la barre garde sa
      // progression et finit plus vite. Arrondi supérieur et plancher 1 : une production en cours
      // ne doit pas tomber à 0, qui signifie « inactive » et perdrait son gain. Bornée à la
      // nouvelle vitesse (l'arrondi pourrait la dépasser d'1 ms).
      product.vitesse = Math.max(1, Math.floor(product.vitesse / palier.ratio));
      if (product.timeleft > 0) {
        product.timeleft = Math.min(
          product.vitesse,
          Math.ceil(product.timeleft / palier.ratio),
        );
      }
    }
  }
}

// Unlocks d'un produit (sujet §8) : chaque palier non débloqué dont le seuil est atteint passe
// `unlocked` et applique son bonus. Un achat qui saute plusieurs seuils débloque tout d'un coup ;
// `!unlocked` testé en premier garantit qu'un bonus n'est jamais appliqué deux fois.
// Retourne les paliers débloqués par cet appel (logs, tests).
export function checkProductUnlocks(world: World, product: Product): Palier[] {
  const unlocked: Palier[] = [];
  for (const palier of product.paliers) {
    if (!palier.unlocked && product.quantite >= palier.seuil) {
      palier.unlocked = true;
      applyBonus(world, palier);
      unlocked.push(palier);
    }
  }
  return unlocked;
}

// Allunlocks (sujet §8) : même principe, condition = TOUS les produits ont quantite >= seuil.
// Un seul produit à 0 bloque donc tous les allunlocks, c'est voulu.
export function checkAllUnlocks(world: World): Palier[] {
  const unlocked: Palier[] = [];
  for (const palier of world.allunlocks) {
    if (
      !palier.unlocked &&
      world.products.every((p) => p.quantite >= palier.seuil)
    ) {
      palier.unlocked = true;
      applyBonus(world, palier);
      unlocked.push(palier);
    }
  }
  return unlocked;
}

// Ressource qui paie un upgrade : `money` pour world.upgrades, `activeangels` pour
// world.angelupgrades (totalangels n'est jamais débité : il sert au calcul des anges gagnés au
// prochain reset, phase 7).
export type UpgradeResource = 'money' | 'activeangels';

// Achat d'un upgrade (sujet §6.4, GAME-RULES.md §Upgrades) : facteur commun d'acheterCashUpgrade
// et acheterAngelUpgrade. Cherche le palier par nom dans `list` uniquement (un nom de manager ou
// de palier produit passé ici → « n'existe pas »), refuse un palier déjà acheté, débite `seuil`
// sur `resource` (`<` strict : un solde exactement égal au prix passe), puis applique le bonus
// comme un unlock. Messages d'erreur exacts : le frontend et les tests e2e les comparent.
export function buyUpgrade(
  world: World,
  list: Palier[],
  name: string,
  resource: UpgradeResource,
): Palier {
  const palier = list.find((p) => p.name === name);
  if (!palier) {
    throw new Error(`L'upgrade ${name} n'existe pas`);
  }
  if (palier.unlocked) {
    throw new Error(`L'upgrade ${name} est déjà achetée`);
  }
  if (world[resource] < palier.seuil) {
    throw new Error(
      resource === 'money' ? "Pas assez d'argent" : "Pas assez d'anges",
    );
  }
  world[resource] -= palier.seuil;
  palier.unlocked = true;
  applyBonus(world, palier);
  return palier;
}

// Plus grand entier que le type GraphQL `Int` sait sérialiser (32 bits signés). Le schéma du sujet
// type les anges en `Int!` : au-delà, getWorld échouerait entièrement (D36).
export const MAX_INT32 = 2_147_483_647;

// Anges acquis depuis le début de la partie (RG-09, formule imposée par le sujet frontend) :
//   150 × √(score / 10¹⁵), arrondi à l'entier inférieur (les anges sont typés Int), plafonné à
// MAX_INT32 (atteint seulement au-delà d'un score de ~2·10²⁹).
export function totalAngelsFor(score: number): number {
  return Math.min(MAX_INT32, Math.floor(150 * Math.sqrt(Math.max(0, score) / 1e15)));
}

// Anges SUPPLÉMENTAIRES gagnés si le joueur faisait un reset maintenant (RG-09, remplace la
// formule linéaire de D20) : totalAngelsFor(score) − totalangels, borné à 0. `score` cumule tout
// l'argent gagné depuis le tout début (jamais remis à zéro), `totalangels` tout ce qui a déjà été
// distribué : la différence est ce que la partie en cours a rapporté. 1 ange dès 4,45·10¹⁰ de
// score, 150 anges à 10¹⁵.
export function angelsEarned(world: World): number {
  return Math.max(0, totalAngelsFor(world.score) - world.totalangels);
}

// Reset (sujet §6.5, GAME-RULES.md §Reset) : retourne un NOUVEAU monde, clone profond
// d'origworld (D3 — un spread partagerait les tableaux de produits avec origworld, et le premier
// achat après reset le corromprait), dans lequel ne survivent que `score` et les anges.
// `activeangels += gagnés` (et non `= totalangels`) : les anges déjà dépensés en angelupgrades
// restent dépensés. L'ancien monde n'est pas muté : l'appelant doit sauvegarder le retour.
// Comme updateWorld, `now` est injecté pour les tests.
export function resetWorld(world: World, now: number = Date.now()): World {
  const earned = angelsEarned(world);
  const fresh = structuredClone(origworld);
  fresh.score = world.score;
  fresh.totalangels = world.totalangels + earned;
  fresh.activeangels = world.activeangels + earned;
  fresh.money = 0;
  fresh.lastupdate = now;
  return fresh;
}
