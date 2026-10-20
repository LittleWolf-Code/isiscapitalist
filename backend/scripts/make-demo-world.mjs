// Génère la partie préparée « demo-avance » du protocole de démonstration (docs/PROTOCOLE-DEMO.md).
// Usage, après `npm run build` : node scripts/make-demo-world.mjs <fichier de sortie>
//
// La partie est JOUÉE avec les fonctions du moteur (dist/engine/world-engine.js) : achats au coût
// géométrique réel, paliers débloqués par checkProductUnlocks, upgrade appliqué par buyUpgrade,
// managers engagés comme dans engagerManager. Seul l'argent restant est fixé à la fin, pour que
// l'évaluateur voie un manager et des upgrades achetables. État obtenu (vérifié en fin de script) :
//   - formule des anges « Démo » (10⁶), aucun reset : un reset rapporte des dizaines d'anges ;
//   - Nuka-Cola et Stimpak automatisés (Cappy, Mister Orderly), Affiche Nuka-Cola achetée ;
//   - Vault Boy (Pip-Boy) engageable, Pinkie Pie et Vault Girl achetables ;
//   - Armes à 1 exemplaire, sans manager : production manuelle possible.
import { writeFileSync } from 'node:fs';
import {
  angelsEarned,
  buyCost,
  buyUpgrade,
  checkAllUnlocks,
  checkProductUnlocks,
} from '../dist/engine/world-engine.js';
import { origworld } from '../dist/origworld.js';

const output = process.argv[2];
if (!output) {
  console.error('Usage : node scripts/make-demo-world.mjs <fichier de sortie>');
  process.exit(1);
}

const DEMO_DIVISOR = 1e6;
const MONEY_LEFT = 250_000;
const BUDGET = 1e9;

const world = structuredClone(origworld);
world.angeldivisor = DEMO_DIVISOR;
world.money = BUDGET;

const product = (id) => world.products.find((p) => p.id === id);

function buy(id, quantite) {
  const p = product(id);
  const cost = buyCost(p, quantite);
  if (world.money < cost) throw new Error(`Budget insuffisant pour ${p.name}`);
  world.money -= cost;
  p.quantite += quantite;
  p.cout = p.cout * Math.pow(p.croissance, quantite);
  checkProductUnlocks(world, p);
  checkAllUnlocks(world);
}

function hire(name) {
  const manager = world.managers.find((m) => m.name === name);
  const p = product(manager.idcible);
  if (p.quantite === 0) throw new Error(`${name} : aucun exemplaire de ${p.name} (D42)`);
  world.money -= manager.seuil;
  manager.unlocked = true;
  p.managerUnlocked = true;
}

buy(1, 59); // Nuka-Cola : 60 exemplaires, paliers 25 (vitesse ×2) et 50 (revenus ×2)
buy(2, 30); // Stimpak : palier 25
buy(3, 10); // Pip-Boy
buy(4, 1); // Armes
hire('Cappy');
hire('Mister Orderly');
buyUpgrade(world, world.upgrades, 'Affiche Nuka-Cola', 'money');

// Tout ce qui a été dépensé a d'abord été gagné : le score le compte, plus l'argent restant.
const spent = BUDGET - world.money;
world.money = MONEY_LEFT;
world.score = spent + MONEY_LEFT;
world.lastupdate = Date.now();
for (const p of world.products) p.timeleft = 0;

// Vérifications : l'état attendu par le protocole de démonstration.
const affordable = (list) => list.filter((x) => !x.unlocked && x.seuil <= world.money).map((x) => x.name);
const hireable = world.managers
  .filter((m) => !m.unlocked && m.seuil <= world.money && product(m.idcible).quantite > 0)
  .map((m) => m.name);
const angels = angelsEarned(world);
const checks = [
  ['manager engageable', hireable.length >= 1],
  ['cash upgrade achetable', affordable(world.upgrades).length >= 1],
  ['au moins 10 anges à réclamer', angels >= 10],
  ['aucun reset', world.totalangels === 0 && world.activeangels === 0],
  ['un produit possédé sans manager', world.products.some((p) => p.quantite > 0 && !p.managerUnlocked)],
];
for (const [label, ok] of checks) {
  if (!ok) throw new Error(`État de démonstration incorrect : ${label}`);
}

writeFileSync(output, JSON.stringify(world));
console.log(`Partie écrite dans ${output}`);
console.log(`  argent ${world.money}, score ${Math.round(world.score)}, anges à réclamer ${angels}`);
console.log(`  quantités ${world.products.map((p) => `${p.name} ${p.quantite}`).join(', ')}`);
console.log(`  managers engageables : ${hireable.join(', ')}`);
console.log(`  upgrades achetables : ${affordable(world.upgrades).join(', ')}`);
