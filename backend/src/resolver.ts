import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier, Product, World } from './graphql.js';
import {
  buyCost,
  buyUpgrade,
  checkAllUnlocks,
  checkProductUnlocks,
  resetWorld,
} from './world-engine.js';

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  // Lecture du monde d'un utilisateur : read → updateWorld → save → return.
  // Même getWorld fait évoluer le monde : c'est ainsi que l'argent produit est crédité.
  @Query()
  getWorld(@Args('user') user: string): World {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    this.service.saveWorld(user, world);
    return world;
  }

  // Achat de `quantite` exemplaires du produit `id` : coût géométrique (buyCost),
  // `cout` devient le prix du prochain exemplaire, puis les unlocks (produit, puis all) sont
  // vérifiés. Ordre imposé : après updateWorld et l'achat, avant saveWorld — un bonus vitesse
  // appliqué avant l'évolution temporelle créditerait des productions plus rapides que réelles.
  @Mutation()
  acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ): Product {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const product = this.service.findProduct(world, id);
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    const total = buyCost(product, quantite);
    // `<` strict : un solde exactement égal au coût permet l'achat.
    if (world.money < total) {
      throw new Error("Pas assez d'argent");
    }
    world.money -= total;
    product.quantite += quantite;
    product.cout = product.cout * Math.pow(product.croissance, quantite);
    checkProductUnlocks(world, product);
    checkAllUnlocks(world);
    this.service.saveWorld(user, world);
    return product;
  }

  // Lance une production : timeleft = vitesse. Quantité nulle → erreur ; production déjà en cours
  // → no-op idempotent (un double-clic côté client n'est pas une erreur), voir D12.
  @Mutation()
  lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ): Product {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const product = this.service.findProduct(world, id);
    if (product.quantite === 0) {
      throw new Error(`Aucun exemplaire de ${product.name} à produire`);
    }
    if (product.timeleft === 0) {
      product.timeleft = product.vitesse;
    }
    this.service.saveWorld(user, world);
    return product;
  }

  // Engage un manager : débite `seuil`, passe `unlocked` et `managerUnlocked` du produit cible
  // à true. Aucun bonus appliqué (ratio/typeratio des managers sont décoratifs, D13) ; refuse si
  // le produit n'a aucun exemplaire (D24) — sinon updateWorld ferait tourner sa production en
  // boucle pour un gain de 0. La quantité est vérifiée avant l'argent : « pas assez d'argent »
  // enverrait sur une fausse piste un joueur qui ne possède pas encore le produit.
  @Mutation()
  engagerManager(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const manager = this.service.findManager(world, name);
    if (manager.unlocked) {
      throw new Error(`Le manager ${name} est déjà engagé`);
    }
    const product = this.service.findProduct(world, manager.idcible);
    if (product.quantite === 0) {
      throw new Error(
        `Aucun exemplaire de ${product.name} : achetez le produit avant d'engager son manager`,
      );
    }
    if (world.money < manager.seuil) {
      throw new Error("Pas assez d'argent");
    }
    world.money -= manager.seuil;
    manager.unlocked = true;
    product.managerUnlocked = true;
    this.service.saveWorld(user, world);
    return manager;
  }

  // Pause / reprise de l'automatisation d'un manager engagé (D20, hors sujet) : bascule
  // `managerUnlocked` du produit. Le palier manager n'est pas touché (`unlocked` reste true : le
  // manager est acheté une fois pour toutes, pas de remboursement — sinon PalierList le proposerait
  // à nouveau). Aucun autre état à gérer : updateWorld lit déjà `managerUnlocked` à chaque appel,
  // la branche « sans manager » finit la production entamée puis s'arrête, la branche « avec
  // manager » reprend la boucle là où elle en était.
  @Mutation()
  basculerManager(@Args('user') user: string, @Args('id') id: number): Product {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const product = this.service.findProduct(world, id);
    if (!this.service.hasManager(world, product)) {
      throw new Error(`Aucun manager engagé pour ${product.name}`);
    }
    product.managerUnlocked = !product.managerUnlocked;
    this.service.saveWorld(user, world);
    return product;
  }

  // Achat d'un upgrade payé en argent (world.upgrades) : même sémantique qu'un unlock, mais
  // déclenché par le joueur contre `seuil` $. updateWorld d'abord, sinon l'argent produit depuis
  // la dernière requête ne serait pas disponible pour payer.
  @Mutation()
  acheterCashUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const palier = buyUpgrade(world, world.upgrades, name, 'money');
    this.service.saveWorld(user, world);
    return palier;
  }

  // Achat d'un upgrade payé en anges actifs (world.angelupgrades). Seul `activeangels` est
  // débité ; `totalangels` reste intact (base du calcul des anges gagnés au reset, phase 7).
  @Mutation()
  acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const palier = buyUpgrade(world, world.angelupgrades, name, 'activeangels');
    this.service.saveWorld(user, world);
    return palier;
  }

  // Reset (« prestige ») : la partie est abandonnée contre des anges calculés sur le score.
  // updateWorld d'abord : les productions terminées depuis la dernière requête comptent dans le
  // score, donc dans les anges gagnés. resetWorld retourne un NOUVEAU monde (l'ancien n'est pas
  // muté) : c'est lui qu'on sauvegarde et qu'on retourne.
  @Mutation()
  resetWorld(@Args('user') user: string): World {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);
    const fresh = resetWorld(world);
    this.service.saveWorld(user, fresh);
    return fresh;
  }
}
