// Moteur du jeu : fonctions PURES (pas d'injection Nest, pas d'accès fichier), importées par
// AppService et le resolver. Testables avec vitest sans instancier Nest (voir docs/DECISIONS.md, D10).
// Phase 3 : buyCost. Phase 4 : updateWorld. Phase 5 : applyBonus, checkProductUnlocks, checkAllUnlocks.
// Phase 6 : buyUpgrade. Phase 7 : angelsEarned, resetWorld.
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
    const gain = productionGain(world, product);

    if (!product.managerUnlocked) {
      // Sans manager : au plus une production, lancée manuellement (timeleft 0 = inactif).
      if (product.timeleft === 0) {
        continue;
      }
      if (product.timeleft <= elapsed) {
        world.money += gain;
        world.score += gain;
        product.timeleft = 0;
      } else {
        product.timeleft -= elapsed;
      }
      continue;
    }

    // Avec manager : la production tourne en boucle. Un produit inactif est considéré comme
    // venant de démarrer. `n` est calculé par formule (O(1)) : une absence de plusieurs jours
    // ne doit pas déclencher une boucle de millions d'itérations.
    if (product.timeleft === 0) {
      product.timeleft = product.vitesse;
    }
    if (elapsed < product.timeleft) {
      product.timeleft -= elapsed;
    } else {
      const remaining = elapsed - product.timeleft;
      const n = 1 + Math.floor(remaining / product.vitesse);
      world.money += n * gain;
      world.score += n * gain;
      product.timeleft = product.vitesse - (remaining % product.vitesse);
    }
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
      // Jamais sous 1 ms (division par zéro dans updateWorld sinon). Une production en cours est
      // plafonnée à la nouvelle vitesse : elle ne doit pas durer plus qu'un cycle complet.
      product.vitesse = Math.max(1, Math.floor(product.vitesse / palier.ratio));
      product.timeleft = Math.min(product.timeleft, product.vitesse);
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

// Score nécessaire par ange gagné : « 2 % du score », soit 1 ange pour 50 de score (D20 — seul
// point à changer si l'enseignant impose une autre courbe). On divise par 50 plutôt que de
// multiplier par 0.02 : la division d'un multiple exact de 50 est exacte en IEEE 754, alors que
// 0.02 n'a pas de représentation binaire finie.
export const SCORE_PER_ANGEL = 50;

// Anges gagnés si le joueur faisait un reset maintenant (D20, amende la formule AdVenture
// Capitalist de D7, injouable avec l'origworld du TP) :
//   floor(score / SCORE_PER_ANGEL) - totalangels, borné à 0.
// `score` cumule tout l'argent gagné depuis le tout début (jamais remis à zéro), `totalangels`
// tout ce qui a déjà été distribué : la différence est ce que la partie en cours a rapporté.
// En dessous de score = 50 → 0 ange.
export function angelsEarned(world: World): number {
  return Math.max(
    0,
    Math.floor(world.score / SCORE_PER_ANGEL) - world.totalangels,
  );
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
