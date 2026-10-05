// Simulation d'équilibrage du monde initial (F-33 du cahier des charges : « croissance des revenus
// ni trop rapide, ni trop lente »). Joue une partie avec les VRAIES règles du moteur
// (dist/world-engine.js, donc après `npm run build`) : pas de 100 ms comme le client, joueur actif
// qui relance chaque production manuelle dès qu'elle finit, et qui chaque seconde engage les
// managers, achète les cash upgrades payables, puis les produits au meilleur rapport
// revenu / coût. Affiche le temps de jeu de chaque jalon, jusqu'à 150 anges (score 10¹⁵).
// Avec --resets, le joueur fait un reset dès qu'il doublerait ses anges (au moins 10 de plus).
//   node scripts/simulate-balance.mjs [--resets]
import {
  advanceProduction,
  angelsEarned,
  resetWorld,
  buyCost,
  buyUpgrade,
  checkAllUnlocks,
  checkProductUnlocks,
  productionGain,
  totalAngelsFor,
} from '../dist/world-engine.js';
import { origworld } from '../dist/origworld.js';

const STEP_MS = 100;
const MAX_HOURS = 72;
const RESETS = process.argv.includes('--resets');
let world = structuredClone(origworld);
let resets = 0;
const milestones = [];
let t = 0;

const mark = (label) => {
  if (!milestones.some((m) => m.label === label)) milestones.push({ label, t });
};
const fmt = (ms) => {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h} h ${String(m).padStart(2, '0')} min ${String(s % 60).padStart(2, '0')} s`;
};

function shop() {
  for (const manager of world.managers) {
    const product = world.products.find((p) => p.id === manager.idcible);
    if (!manager.unlocked && product.quantite > 0 && world.money >= manager.seuil) {
      world.money -= manager.seuil;
      manager.unlocked = true;
      product.managerUnlocked = true;
      mark(`manager « ${manager.name} »`);
    }
  }
  for (const upgrade of world.upgrades) {
    if (!upgrade.unlocked && world.money >= upgrade.seuil) {
      buyUpgrade(world, world.upgrades, upgrade.name, 'money');
    }
  }
  for (;;) {
    let best = null;
    for (const p of world.products) {
      const income = (p.revenu * (1 + (world.activeangels * world.angelbonus) / 100)) / (p.vitesse / 1000);
      const ratio = income / p.cout;
      if (!best || ratio > best.ratio) best = { p, ratio };
    }
    if (buyCost(best.p, 1) > world.money) break;
    world.money -= buyCost(best.p, 1);
    best.p.quantite += 1;
    best.p.cout *= best.p.croissance;
    checkProductUnlocks(world, best.p);
    for (const palier of checkAllUnlocks(world)) mark(`allunlock « ${palier.name} »`);
    if (best.p.quantite === 1) mark(`premier exemplaire « ${best.p.name} »`);
  }
}

while (t < MAX_HOURS * 3600_000 && world.score < 1e15 && world.totalangels < 150) {
  for (const p of world.products) {
    if (!p.managerUnlocked && p.timeleft === 0 && p.quantite > 0) p.timeleft = p.vitesse;
    const { timeleft, produced } = advanceProduction(p, STEP_MS);
    const gain = produced * productionGain(world, p);
    world.money += gain;
    world.score += gain;
    p.timeleft = timeleft;
  }
  t += STEP_MS;
  if (t % 1000 === 0) {
    const earned = angelsEarned(world);
    if (RESETS && earned >= Math.max(10, world.totalangels)) {
      world = resetWorld(world, 0);
      resets++;
      mark(`reset n° ${resets} → ${world.totalangels} anges`);
    }
    shop();
  }
  if (world.managers.every((m) => m.unlocked)) mark('tous les managers');
  for (const [score, label] of [[1e6, 'score 1 M'], [1e9, 'score 1 G'], [4.45e10, 'premier ange'], [1e12, 'score 1 T'], [1e15, '150 anges (score 10¹⁵)']]) {
    if (world.score >= score) mark(label);
  }
}

for (const m of milestones.sort((a, b) => a.t - b.t)) {
  console.log(`${fmt(m.t).padStart(18)}  ${m.label}`);
}
console.log(`\nFin à ${fmt(t)} : score ${world.score.toExponential(3)}, ${totalAngelsFor(world.score)} anges acquis, ` +
  `${world.upgrades.filter((u) => u.unlocked).length}/10 upgrades, quantités ${world.products.map((p) => p.quantite).join(' / ')}`);
