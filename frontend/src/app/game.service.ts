// Service du jeu (F-02, F-03) : signaux partagés (pseudo, serveur, monde, message éphémère),
// boucle principale du client (calcScore, F-11) et actions du joueur. Le client est AUTONOME
// (D36) : chaque action est d'abord appliquée au monde local, puis transmise au serveur par la
// mutation du sujet ; le monde n'est relu (getWorld) qu'au démarrage, au changement de pseudo, sur
// Refresh, après un reset et après un échec de transmission — le serveur fait foi (NF-03).
// Seul fichier qui injecte Apollo : les composants sont présentationnels.
import { DestroyRef, Injectable, effect, inject, linkedSignal, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { Apollo, CombinedGraphQLErrors } from '@apollo-orbit/angular';
import { DISPLAY_STORAGE_KEY, DisplaySettings, readStoredDisplay } from './display-settings';
import {
  PalierData,
  ProductData,
  WorldData,
  advanceProduction,
  angelsEarned,
  applyBonus,
  applyUnlocks,
  bonusLabel,
  buyCost,
  productionGain,
  replaceProduct,
} from './game-math';
import {
  ACHETER_ANGEL_UPGRADE_MUTATION,
  ACHETER_CASH_UPGRADE_MUTATION,
  ACHETER_QT_PRODUIT_MUTATION,
  ENGAGER_MANAGER_MUTATION,
  GET_WORLD_QUERY,
  LANCER_PRODUCTION_PRODUIT_MUTATION,
  RESET_WORLD_MUTATION,
} from './graphql';
import { SERVER } from './server';

export type { PalierData, ProductData, WorldData } from './game-math';

// Mode d'achat (F-13) : quantité fixe, ou 'max' (le plus grand nombre payable, calculé par la carte).
export type Multiplier = 1 | 10 | 100 | 'max';

// Modèle du formulaire de pseudo (F-23, formulaire signal du sujet).
export interface UserLogin {
  name: string;
}

// Clé du pseudo imposée par le sujet ; l'ancienne clé de la phase 9 est migrée une fois.
export const USERNAME_STORAGE_KEY = 'username';
export const LEGACY_USER_STORAGE_KEY = 'isiscapitalist.user';

// Période de la boucle principale (F-11).
const TICK_INTERVAL_MS = 100;

// Message brut d'une erreur Apollo Client 4 : pour une erreur GraphQL, `mutate()` rejette avec
// CombinedGraphQLErrors dont `.errors[i].message` est le message levé par le resolver
// (ex. « Pas assez d'argent »).
export function errorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => e.message).join('\n');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Pseudo de départ (F-23) : celui mémorisé sous `username`, sinon celui de la phase 9 (migré),
// sinon un pseudo aléatoire « Captain<n> » (0 ≤ n < 10 000) — jamais vide, pour que deux
// nouveaux visiteurs ne partagent pas la même partie. localStorage indisponible → aléatoire.
export function readStoredUsername(random: () => number = Math.random): string {
  try {
    const stored =
      localStorage.getItem(USERNAME_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    if (stored) {
      return stored;
    }
  } catch {
    // Navigation privée : pas de mémoire, pseudo aléatoire.
  }
  return 'Captain' + Math.floor(random() * 10000);
}

function storeUsername(name: string): void {
  try {
    localStorage.setItem(USERNAME_STORAGE_KEY, name);
  } catch {
    // localStorage indisponible : le pseudo ne survit pas au rechargement.
  }
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly apollo = inject(Apollo);

  // Adresse du backend (server.ts) : images = server() + logo.
  readonly server = SERVER;
  // Pseudo saisi (formulaire signal) et pseudo validé : seul `user` déclenche getWorld.
  readonly UserloginModel = signal<UserLogin>({ name: '' });
  readonly loginForm = form(this.UserloginModel);
  readonly user = signal('');
  // Réglages d'affichage CRT (D34, persistés en un seul JSON).
  readonly display = signal<DisplaySettings>(readStoredDisplay());
  // Message éphémère (F-20) : App ouvre un snack-bar à chaque set(), même texte répété compris.
  readonly snackmessage = signal('', { equal: () => false });

  // getWorld (F-03) : no-cache, le serveur est la référence au chargement ; suspendu (variables
  // null) tant qu'aucun pseudo n'est validé.
  readonly worldQuery = this.apollo.signal.query({
    query: GET_WORLD_QUERY,
    fetchPolicy: 'no-cache',
    variables: () => {
      const user = this.user();
      return user ? { user } : null;
    },
  });

  // Monde affiché (F-03) : réinitialisé à chaque réponse de getWorld, modifié localement entre
  // deux réponses (calcScore, actions). Pendant un rechargement (données momentanément absentes)
  // le dernier monde reste affiché.
  readonly world = linkedSignal<WorldData | null | undefined, WorldData | undefined>({
    source: () => this.worldQuery.data()?.getWorld,
    computation: (world, previous) => world ?? previous?.value,
  });

  private readonly acheterQtProduit = this.apollo.signal.mutation(ACHETER_QT_PRODUIT_MUTATION, {
    fetchPolicy: 'no-cache',
  });
  private readonly lancerProductionProduit = this.apollo.signal.mutation(
    LANCER_PRODUCTION_PRODUIT_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly engagerManager = this.apollo.signal.mutation(ENGAGER_MANAGER_MUTATION, {
    fetchPolicy: 'no-cache',
  });
  private readonly acheterCashUpgrade = this.apollo.signal.mutation(
    ACHETER_CASH_UPGRADE_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly acheterAngelUpgrade = this.apollo.signal.mutation(
    ACHETER_ANGEL_UPGRADE_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly resetWorldMutation = this.apollo.signal.mutation(RESET_WORLD_MUTATION, {
    fetchPolicy: 'no-cache',
  });

  // Instant du dernier passage de calcScore (performance.now, F-11).
  private lastTick = performance.now();

  constructor() {
    // Pseudo initial (F-23) : mémorisé, migré ou Captain<n>, posé dans le formulaire et validé
    // d'emblée (mémorisé aussi, pour retrouver la même partie au rechargement).
    const username = readStoredUsername();
    this.loginForm.name().value.set(username);
    this.user.set(username);
    storeUsername(username);

    // Échec de getWorld (backend arrêté…) → message éphémère.
    effect(() => {
      const error = this.worldQuery.error();
      if (error) {
        this.snackmessage.set(`Erreur de chargement du monde : ${errorText(error)}`);
      }
    });

    effect(() => {
      const display = this.display();
      try {
        localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(display));
      } catch {
        // localStorage indisponible : les réglages ne survivent pas au rechargement.
      }
    });

    // Boucle principale (F-11) : toutes les 100 ms, l'écart réel est mesuré (onglet en
    // arrière-plan, GC…) plutôt que supposé.
    const timer = setInterval(() => this.calcScore(), TICK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // Évolution du monde depuis le passage précédent (F-11) : même calcul que updateWorld du
  // serveur (advanceProduction) ; chaque production terminée est créditée par productionDone.
  calcScore(now: number = performance.now()): void {
    const elapsed = now - this.lastTick;
    this.lastTick = now;
    const world = this.world();
    if (!world || elapsed <= 0) {
      return;
    }
    const done: [ProductData, number][] = [];
    let changed = false;
    const products = world.products.map((p) => {
      const { timeleft, produced } = advanceProduction(p, elapsed);
      if (produced > 0) {
        done.push([p, produced]);
      }
      if (timeleft === p.timeleft) {
        return p;
      }
      changed = true;
      return { ...p, timeleft };
    });
    if (changed) {
      this.world.set({ ...world, products });
    }
    for (const [product, qt] of done) {
      this.productionDone(product, qt);
    }
  }

  // `qt` productions de `prod` terminées (F-12) : argent ET score augmentés du gain, bonus des
  // anges compris (F-30).
  productionDone(prod: ProductData, qt: number): void {
    this.world.update((world) => {
      if (!world) return world;
      const gain = productionGain(world, prod) * qt;
      return { ...world, money: world.money + gain, score: world.score + gain };
    });
  }

  // Clic sur l'icône d'un produit (F-10, F-17) : lance une production si le produit a au moins
  // un exemplaire, n'est pas automatisé et n'est pas déjà en production.
  startProduction(product: ProductData): void {
    const world = this.world();
    const current = world?.products.find((p) => p.id === product.id);
    if (!world || !current || current.quantite === 0 || current.managerUnlocked || current.timeleft > 0) {
      return;
    }
    this.world.set(replaceProduct(world, current.id, (p) => ({ ...p, timeleft: p.vitesse })));
    void this.send('le lancement de la production', (user) =>
      this.lancerProductionProduit.mutate({ variables: { user, id: current.id } }),
    );
  }

  // Achat de `qt` exemplaires (F-15) : quantité, coût du prochain exemplaire et argent mis à jour,
  // unlocks du produit puis allunlocks appliqués (F-26), message éphémère, mutation.
  buyProduct(qt: number, product: ProductData): void {
    const world = this.world();
    const current = world?.products.find((p) => p.id === product.id);
    if (!world || !current || qt <= 0) {
      return;
    }
    const cost = buyCost(current, qt);
    if (cost > world.money) {
      return;
    }
    const bought = replaceProduct({ ...world, money: world.money - cost }, current.id, (p) => ({
      ...p,
      quantite: p.quantite + qt,
      cout: p.cout * Math.pow(p.croissance, qt),
    }));
    const { world: next, unlocked } = applyUnlocks(bought, current.id);
    this.world.set(next);
    if (unlocked.length > 0) {
      const list = unlocked.map((p) => `${p.name} (${bonusLabel(p)})`).join(', ');
      this.snackmessage.set(`Palier${unlocked.length > 1 ? 's' : ''} débloqué${unlocked.length > 1 ? 's' : ''} : ${list}`);
    }
    void this.send("l'achat du produit", (user) =>
      this.acheterQtProduit.mutate({ variables: { user, id: current.id, quantite: qt } }),
    );
  }

  // Engagement d'un manager (F-19, F-22) : argent vérifié puis débité, manager et produit
  // débloqués, production lancée immédiatement si le produit était au repos.
  hireManager(manager: PalierData): void {
    const world = this.world();
    const current = world?.managers.find((m) => m.name === manager.name);
    if (!world || !current || current.unlocked || world.money < current.seuil) {
      return;
    }
    const hired: WorldData = {
      ...world,
      money: world.money - current.seuil,
      managers: world.managers.map((m) => (m === current ? { ...m, unlocked: true } : m)),
    };
    this.world.set(
      replaceProduct(hired, current.idcible, (p) => ({
        ...p,
        managerUnlocked: true,
        timeleft: p.timeleft > 0 ? p.timeleft : p.vitesse,
      })),
    );
    const product = world.products.find((p) => p.id === current.idcible);
    this.snackmessage.set(`${current.name} engagé : ${product?.name ?? 'le produit'} est automatisé`);
    void this.send("l'engagement du manager", (user) =>
      this.engagerManager.mutate({ variables: { user, name: current.name } }),
    );
  }

  // Achat d'un cash upgrade (F-28) : payé en argent, bonus appliqué comme un unlock.
  buyUpgrade(upgrade: PalierData): void {
    const world = this.world();
    const current = world?.upgrades.find((u) => u.name === upgrade.name);
    if (!world || !current || current.unlocked || world.money < current.seuil) {
      return;
    }
    const bought: WorldData = {
      ...world,
      money: world.money - current.seuil,
      upgrades: world.upgrades.map((u) => (u === current ? { ...u, unlocked: true } : u)),
    };
    this.world.set(applyBonus(bought, current));
    this.snackmessage.set(`Upgrade acheté : ${current.name} (${bonusLabel(current)})`);
    void this.send("l'achat de l'upgrade", (user) =>
      this.acheterCashUpgrade.mutate({ variables: { user, name: current.name } }),
    );
  }

  // Achat d'un angel upgrade (F-32) : payé en anges actifs (perdus), type `ange` → angelbonus,
  // sinon gain / vitesse comme un unlock.
  buyAngelUpgrade(upgrade: PalierData): void {
    const world = this.world();
    const current = world?.angelupgrades.find((u) => u.name === upgrade.name);
    if (!world || !current || current.unlocked || world.activeangels < current.seuil) {
      return;
    }
    const bought: WorldData = {
      ...world,
      activeangels: world.activeangels - current.seuil,
      angelupgrades: world.angelupgrades.map((u) => (u === current ? { ...u, unlocked: true } : u)),
    };
    this.world.set(applyBonus(bought, current));
    this.snackmessage.set(`Angel upgrade acheté : ${current.name} (${bonusLabel(current)})`);
    void this.send("l'achat de l'angel upgrade", (user) =>
      this.acheterAngelUpgrade.mutate({ variables: { user, name: current.name } }),
    );
  }

  // Reset (F-29) : mutation resetWorld, puis rechargement du monde remis à zéro par le serveur.
  async reset(): Promise<void> {
    const world = this.world();
    const earned = world ? angelsEarned(world) : 0;
    if (await this.send('le reset du monde', (user) => this.resetWorldMutation.mutate({ variables: { user } }))) {
      this.snackmessage.set(`Monde remis à zéro : ${earned} ange(s) gagné(s)`);
      this.refreshWorld();
    }
  }

  // Validation du pseudo par Entrée (F-23) : mémorisé (clé `username`), la partie bascule sur ce
  // joueur. Pseudo vide ignoré (le serveur exige un user).
  commitName(): void {
    const field = this.loginForm.name().value().trim();
    if (!field) {
      return;
    }
    storeUsername(field);
    this.user.set(field);
  }

  // Bouton Refresh (F-24) : relit le monde sur le serveur. Une erreur réseau est déjà signalée
  // par l'effet sur worldQuery.error().
  refreshWorld(): void {
    this.worldQuery.refetch().catch(() => undefined);
  }

  // Transmission d'une action au serveur : échec → message éphémère avec le texte du serveur
  // (F-16, F-20) et rechargement du monde, puisque le monde local a divergé. Sans pseudo, rien
  // n'est envoyé. Retourne true si le serveur a accepté.
  private async send(action: string, mutation: (user: string) => Promise<unknown>): Promise<boolean> {
    const user = this.user();
    if (!user) {
      return false;
    }
    try {
      await mutation(user);
      return true;
    } catch (error) {
      this.snackmessage.set(`Erreur de transmission serveur pour ${action} : ${errorText(error)}`);
      this.refreshWorld();
      return false;
    }
  }
}
