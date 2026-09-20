// Seul point de contact avec le serveur GraphQL : porte l'utilisateur courant, le monde affiché,
// les 7 mutations, le message d'erreur et le timer local. Les composants (ProductCard, PalierList)
// sont purement présentationnels et ne connaissent pas Apollo.
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Apollo, CombinedGraphQLErrors } from '@apollo-orbit/angular';
import {
  ACHETER_ANGEL_UPGRADE_MUTATION,
  ACHETER_CASH_UPGRADE_MUTATION,
  ACHETER_QT_PRODUIT_MUTATION,
  BASCULER_MANAGER_MUTATION,
  ENGAGER_MANAGER_MUTATION,
  GET_WORLD_QUERY,
  GetWorldQueryData,
  LANCER_PRODUCTION_PRODUIT_MUTATION,
  PalierFieldsFragment,
  RESET_WORLD_MUTATION,
} from './graphql';

// Types tels que retournés par getWorld (sous-ensemble structurel de World / Product / Palier).
export type WorldData = NonNullable<GetWorldQueryData['getWorld']>;
export type ProductData = WorldData['products'][number];
export type PalierData = PalierFieldsFragment;

// Mode d'achat : quantité fixe, ou 'max' (le plus grand nombre payable, calculé par ProductCard).
export type Multiplier = 1 | 10 | 100 | 'max';

// Onglets de la barre du bas (D19, élargis en D22) : un écran par onglet, toujours un actif.
export type Tab = 'products' | 'managers' | 'upgrades' | 'angels' | 'unlocks' | 'settings';
export const TABS: readonly Tab[] = ['products', 'managers', 'upgrades', 'angels', 'unlocks', 'settings'];

export const USER_STORAGE_KEY = 'isiscapitalist.user';
export const DEFAULT_USER = 'lucas';
export const USER_REQUIRED_MESSAGE = 'Utilisateur requis';

// Préférence d'affichage, persistée comme `user`. L'ancienne valeur 'none' (panneau fermé,
// D19) n'existe plus : elle est lue comme inconnue → DEFAULT_TAB.
export const TAB_STORAGE_KEY = 'isiscapitalist.tab';
export const DEFAULT_TAB: Tab = 'products';

// Réglages de l'effet écran cathodique (D22), une clé par réglage, valeurs 'on' / 'off'.
export const SCANLINES_STORAGE_KEY = 'isiscapitalist.scanlines';
export const GLOW_STORAGE_KEY = 'isiscapitalist.glow';
export const FLICKER_STORAGE_KEY = 'isiscapitalist.flicker';
export const DEFAULT_SCANLINES = true;
export const DEFAULT_GLOW = true;
export const DEFAULT_FLICKER = false;

// Période de rafraîchissement serveur (getWorld) et du timer local d'animation des barres.
const POLL_INTERVAL_MS = 2000;
const TICK_INTERVAL_MS = 100;

// Message brut d'une erreur Apollo Client 4 : pour une erreur GraphQL, `mutate()` rejette avec
// CombinedGraphQLErrors dont `.errors[i].message` est le message levé par le resolver
// (ex. « Pas assez d'argent ») — c'est ce texte exact que le bandeau doit montrer.
export function errorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => e.message).join('\n');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function readStoredUser(): string {
  try {
    return localStorage.getItem(USER_STORAGE_KEY) ?? DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

// Onglet mémorisé : absent, inconnu (dont l'ancien 'none') ou localStorage indisponible
// → DEFAULT_TAB.
export function readStoredTab(): Tab {
  try {
    const value = localStorage.getItem(TAB_STORAGE_KEY);
    return (TABS as readonly string[]).includes(value ?? '') ? (value as Tab) : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

// Interrupteur mémorisé : 'on' → true, 'off' → false ; absent, inconnu ou localStorage
// indisponible → fallback.
export function readStoredFlag(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === 'on' ? true : value === 'off' ? false : fallback;
  } catch {
    return fallback;
  }
}

// Écriture d'un interrupteur, silencieuse si localStorage est indisponible.
function storeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? 'on' : 'off');
  } catch {
    // Navigation privée… : le réglage ne survit pas au rechargement, sans erreur.
  }
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly apollo = inject(Apollo);

  // Utilisateur courant (persisté dans localStorage). Vide → aucun appel serveur.
  readonly user = signal(readStoredUser());
  // Mode d'achat global (bouton Acheter xN / max des produits).
  readonly multiplier = signal<Multiplier>(1);
  // Onglet actif de la barre du bas (persisté dans localStorage), jamais nul (D22).
  readonly activeTab = signal<Tab>(readStoredTab());
  // Réglages CRT (persistés) : App les pose en classes crt-* sur <app-root>, SettingsPanel les édite.
  readonly scanlines = signal(readStoredFlag(SCANLINES_STORAGE_KEY, DEFAULT_SCANLINES));
  readonly glow = signal(readStoredFlag(GLOW_STORAGE_KEY, DEFAULT_GLOW));
  readonly flicker = signal(readStoredFlag(FLICKER_STORAGE_KEY, DEFAULT_FLICKER));
  // Dernier monde reçu du serveur, remplacé EN ENTIER à chaque réponse getWorld (D14) ; seul
  // `timeleft` des produits est modifié localement entre deux réponses (D15).
  readonly world = signal<WorldData | undefined>(undefined);
  // Message du dernier échec (serveur ou réseau), effacé par un clic sur le bandeau.
  readonly errorMessage = signal<string | null>(null);

  // getWorld : no-cache (D14), poll toutes les 2 s, suspendu (variables null) si user vide.
  private readonly worldQuery = this.apollo.signal.query({
    query: GET_WORLD_QUERY,
    fetchPolicy: 'no-cache',
    pollInterval: POLL_INTERVAL_MS,
    variables: () => {
      const user = this.user();
      return user ? { user } : null;
    },
  });

  private readonly acheterQtProduit = this.apollo.signal.mutation(
    ACHETER_QT_PRODUIT_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly lancerProductionProduit = this.apollo.signal.mutation(
    LANCER_PRODUCTION_PRODUIT_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly engagerManager = this.apollo.signal.mutation(
    ENGAGER_MANAGER_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly basculerManager = this.apollo.signal.mutation(
    BASCULER_MANAGER_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly acheterCashUpgrade = this.apollo.signal.mutation(
    ACHETER_CASH_UPGRADE_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly acheterAngelUpgrade = this.apollo.signal.mutation(
    ACHETER_ANGEL_UPGRADE_MUTATION,
    { fetchPolicy: 'no-cache' },
  );
  private readonly resetWorldMutation = this.apollo.signal.mutation(
    RESET_WORLD_MUTATION,
    { fetchPolicy: 'no-cache' },
  );

  constructor() {
    // Toute réponse getWorld remplace l'état local ; une réponse vide (chargement, changement
    // d'utilisateur) conserve le dernier monde affiché.
    effect(() => {
      const world = this.worldQuery.data()?.getWorld;
      if (world) {
        this.world.set(world);
      }
    });

    // Échec de getWorld (backend arrêté, user inconnu…) → bandeau ; le poll continue.
    effect(() => {
      const error = this.worldQuery.error();
      if (error) {
        this.errorMessage.set(errorText(error));
      }
    });

    effect(() => {
      const user = this.user();
      try {
        localStorage.setItem(USER_STORAGE_KEY, user);
      } catch {
        // localStorage indisponible (navigation privée…) : la valeur ne survit pas au rechargement.
      }
      if (!user) {
        this.errorMessage.set(USER_REQUIRED_MESSAGE);
      }
    });

    effect(() => {
      const tab = this.activeTab();
      try {
        localStorage.setItem(TAB_STORAGE_KEY, tab);
      } catch {
        // localStorage indisponible : l'onglet ne survit pas au rechargement, sans erreur.
      }
    });

    effect(() => storeFlag(SCANLINES_STORAGE_KEY, this.scanlines()));
    effect(() => storeFlag(GLOW_STORAGE_KEY, this.glow()));
    effect(() => storeFlag(FLICKER_STORAGE_KEY, this.flicker()));

    // Timer local : n'anime que timeleft (D15). L'écart réel entre deux ticks est mesuré plutôt
    // que supposé égal à 100 ms (onglet en arrière-plan, GC…).
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      this.tick(now - last);
      last = now;
    }, TICK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // Décrémente timeleft des productions en cours. Sans manager : borné à 0 (le serveur créditera
  // la production au prochain getWorld). Avec manager : la barre repart de vitesse.
  // Ne touche ni money ni score : le serveur les crédite, sinon double comptage au refetch.
  tick(elapsedMs: number): void {
    const world = this.world();
    if (!world || elapsedMs <= 0) {
      return;
    }
    let changed = false;
    const products = world.products.map((p) => {
      if (p.timeleft <= 0) {
        return p;
      }
      let timeleft = p.timeleft - elapsedMs;
      if (timeleft <= 0) {
        timeleft = p.managerUnlocked ? p.vitesse - (-timeleft % p.vitesse) : 0;
      }
      changed = true;
      return { ...p, timeleft };
    });
    if (changed) {
      this.world.set({ ...world, products });
    }
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  // Clic sur un onglet de la barre : il devient actif (re-clic sur l'actif : rien ne change).
  selectTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  // `quantite` vient de ProductCard : en mode 'max' seule la carte connaît la quantité payable.
  buy(id: number, quantite: number): Promise<void> {
    return this.run((user) =>
      this.acheterQtProduit.mutate({ variables: { user, id, quantite } }),
    );
  }

  launch(id: number): Promise<void> {
    return this.run((user) =>
      this.lancerProductionProduit.mutate({ variables: { user, id } }),
    );
  }

  hireManager(name: string): Promise<void> {
    return this.run((user) =>
      this.engagerManager.mutate({ variables: { user, name } }),
    );
  }

  // Pause / reprise de l'automatisation d'un manager engagé (D20). Le timer local n'est pas
  // touché : le getWorld qui suit rapporte le nouveau managerUnlocked et tick() s'y conforme.
  toggleManager(id: number): Promise<void> {
    return this.run((user) =>
      this.basculerManager.mutate({ variables: { user, id } }),
    );
  }

  buyUpgrade(name: string): Promise<void> {
    return this.run((user) =>
      this.acheterCashUpgrade.mutate({ variables: { user, name } }),
    );
  }

  buyAngelUpgrade(name: string): Promise<void> {
    return this.run((user) =>
      this.acheterAngelUpgrade.mutate({ variables: { user, name } }),
    );
  }

  reset(): Promise<void> {
    return this.run((user) =>
      this.resetWorldMutation.mutate({ variables: { user } }),
    );
  }

  // Schéma commun des 7 mutations : succès → bandeau effacé ; échec → message serveur brut ;
  // dans les deux cas refetch de getWorld (le serveur applique updateWorld à chaque appel :
  // c'est ainsi que l'argent produit est crédité, et l'affichage reste aligné même après une
  // erreur). Sans utilisateur, rien n'est envoyé.
  private async run(mutation: (user: string) => Promise<unknown>): Promise<void> {
    const user = this.user();
    if (!user) {
      this.errorMessage.set(USER_REQUIRED_MESSAGE);
      return;
    }
    try {
      await mutation(user);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set(errorText(error));
    } finally {
      try {
        await this.worldQuery.refetch();
      } catch (error) {
        this.errorMessage.set(errorText(error));
      }
    }
  }
}
