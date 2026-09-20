# Spec backend — transcription de `backend.pdf` (ISIS Capitalist, N. Singer)

Transcription fidèle et structurée du sujet. Les extraits de code du PDF sont reproduits ; les
adaptations nécessaires à ce projet (ESM, `.js`, `__dirname`) sont dans `DECISIONS.md`.

## 1. Cadre

- Backend en **Node.js / NestJS** (https://docs.nestjs.com/).
- Front et back dans deux dossiers séparés d'un dépôt git unique : `isiscapitalist/{frontend,backend}`.
- Amorçage (déjà fait) : `git clone https://github.com/nestjs/typescript-starter.git backend && cd backend && npm install`.

## 2. Schéma GraphQL et classes métier (schema-first)

- Dépendances (déjà installées) : `npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql ts-morph`.
- Créer `src/schema.graphql` avec le schéma fourni → voir `reference/schema.graphql`.
- Dans `app.module.ts`, ajouter aux `imports` :

```ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  typePaths: ['./**/*.graphql'],
  definitions: {
    path: join(process.cwd(), 'src/graphql.ts'),
    outputAs: 'class',
  },
}),
```

- `npm run start:dev` génère `src/graphql.ts` (classes `World`, `Product`, `Palier`, enum `RatioType`)
  et lance le playground sur http://localhost:3000 (en pratique `/graphql`).
- Ces classes sont **aussi utilisées par le frontend**.

## 3. Création du monde — `src/origworld.ts`

- Squelette fourni pour 2 produits → `reference/origworld.skeleton.ts`.
- Le monde final doit contenir :
  - **6 produits** (donc **6 managers**, un par produit) ;
  - **≥ 3 unlocks (paliers) par produit** ;
  - **≥ 3 allunlocks** ;
  - **≈ 10 upgrades** ;
  - **quelques angelupgrades**.
- Images dans `backend/public/icones/`. `main.ts` doit devenir :

```ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));   // ⚠ ESM : voir DECISIONS.md
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- Vérifier : http://localhost:3000/icones/image1.jpg accessible.

## 4. Resolver — `src/resolver.ts`

Squelette fourni :

```ts
import { origworld } from './origworld';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service';
import { Palier } from './graphql';

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  @Query()
  async getWorld(@Args('user') user: string) {
    const world = this.service.readUserWorld(user);
    return world;
  }
}
```

Déclarer dans `app.module.ts` : `providers: [AppService, GraphQlResolver]`.

Principe : le code **commun** dans `AppService`, le code **propre à chaque opération** dans le resolver.

## 5. Service — `src/app.service.ts`

### Stockage
Pas de base de données. Dossier `backend/userworlds/`, un fichier par utilisateur : `{user}-world.json`.

### `readUserWorld(user)` (fourni)
Charge `userworlds/{user}-world.json` ; en cas d'exception, retourne `origworld`.

```ts
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  readUserWorld(user: string): World {
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      );
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      console.log((e as Error).message);
      return origworld;
    }
  }
}
```

### `saveWorld(user, world)` (fourni)

```ts
saveWorld(user: string, world: World) {
  fs.writeFile(
    path.join(process.cwd(), 'userworlds/', user + '-world.json'),
    JSON.stringify(world),
    (err) => {
      if (err) {
        console.error(err);
        throw new Error(`Erreur d'écriture du monde coté serveur`);
      }
    },
  );
}
```

**À appeler à la fin de chaque query et mutation, y compris `getWorld`.** Vérifier que `getWorld`
crée bien un fichier dans `userworlds/`.

## 6. Mutations

### 6.1 `acheterQtProduit(user, id, quantite): Product`

```ts
@Mutation()
async acheterQtProduit(
  @Args('user') user: string,
  @Args('id') id: number,
  @Args('quantite') quantite: number,
) {
  // à compléter
}
```

Doit :
1. Obtenir le monde (`readUserWorld`).
2. Trouver le produit d'id `id` ; sinon `throw new Error(\`Le produit avec l'id ${id} n'existe pas\`)`.
3. `quantite` += paramètre ; déduire le coût total de `world.money` ; mettre à jour `product.cout`
   (= coût du **prochain** exemplaire).
4. Vérifier les **unlocks** du produit et les **allunlocks** (cf. §8) — code dans le service.
5. `saveWorld`.

Vérifier au playground : argent en moins, quantité en plus.

### 6.2 `lancerProductionProduit(user, id): Product`
Trouver le produit, affecter `product.timeleft = product.vitesse`. Le serveur note simplement le temps
restant ; la fin de production est détectée par la méthode d'évolution temporelle (§7).

### 6.3 `engagerManager(user, name): Palier`
Trouver le manager de nom `name` dans `world.managers`, repérer son produit (`idcible`), passer
`product.managerUnlocked = true` et `manager.unlocked = true`. (Déduire le coût `seuil` de `money` — cf. GAME-RULES.)

### 6.4 `acheterCashUpgrade(user, name): Palier` / `acheterAngelUpgrade(user, name): Palier`
Débloquer un bonus payé respectivement en argent (`upgrades`) ou en anges (`angelupgrades`).
Réutiliser le code de déblocage des unlocks (§8).

### 6.5 `resetWorld(user): World`
1. Calculer les anges supplémentaires gagnés pendant la partie ; les ajouter à `totalangels` et
   `activeangels`.
2. Repartir du monde original en initialisant `score`, `totalangels`, `activeangels` aux bonnes valeurs
   (le score est conservé).

## 7. Évolution temporelle du monde (méthode du service)

Calculer l'évolution de l'argent depuis `world.lastupdate`. Pour chaque produit, compter combien
d'exemplaires ont été produits depuis la dernière mise à jour :

- **Sans manager** : si `timeleft != 0` et `timeleft <= temps écoulé` → une production terminée
  (ajouter le gain à `money` et `score`, `timeleft = 0`) ; sinon `timeleft -= temps écoulé`.
- **Avec manager** : calculer combien de productions complètes ont pu avoir lieu depuis la dernière
  mise à jour et mettre à jour `timeleft` en conséquence (production continue).
- À chaque mise à jour, repositionner `world.lastupdate` sur l'instant courant.

Échantillon de test fourni : https://gitlab.com/-/snippets/2522185 (à récupérer manuellement).

## 8. Unlocks

- **Unlock produit** (`product.paliers`) : se débloque quand `product.quantite >= palier.seuil`.
- **Allunlock** (`world.allunlocks`) : se débloque quand **tous** les produits ont `quantite >= seuil`.
- À chaque déblocage : passer `unlocked = true` et **appliquer le bonus** (cf. GAME-RULES §Bonus).
- Vérifié à chaque `acheterQtProduit`, code dans le service.

## 9. Bonus anges

`angelbonus` = bonus de revenu **par ange actif** en % (initialement 2). Revenu d'une production :

```
product.quantite * product.revenu * (1 + world.activeangels * world.angelbonus / 100)
```
