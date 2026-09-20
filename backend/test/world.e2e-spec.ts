import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './../src/app.module.js';
import { World } from './../src/graphql.js';

// Test de bout en bout : HTTP → Apollo → resolver → fichier userworlds/<user>-world.json.
// Un seul AppModule pour toute la suite (beforeAll) : son init régénère src/graphql.ts, inutile de
// le refaire à chaque cas. Utilisateur jetable, fichier supprimé en afterAll.
// Les cas sont ordonnés : chacun repart de l'état laissé par le précédent.
// saveWorld est synchrone (D8) : lire le fichier juste après la réponse est fiable.
describe('World GraphQL API (e2e)', () => {
  let app: INestApplication<App>;
  const user = `e2e-${Date.now()}`;
  const worldFile = path.join(
    process.cwd(),
    'userworlds',
    `${user}-world.json`,
  );

  const readFile = (): World => JSON.parse(fs.readFileSync(worldFile, 'utf8'));
  const writeFile = (world: World) =>
    fs.writeFileSync(worldFile, JSON.stringify(world));
  const gql = (query: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(worldFile, { force: true });
  });

  it('getWorld crée le fichier du joueur à partir du monde initial', async () => {
    const res = await gql(
      `query { getWorld(user: "${user}") { name money products { id quantite } } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.getWorld.name).toBe('World');
    expect(fs.existsSync(worldFile)).toBe(true);
    expect(readFile().name).toBe('World');
  });

  it('acheterQtProduit débite le coût géométrique et fait monter le prix', async () => {
    // Le monde initial démarre à 0 $ : on crédite le fichier directement.
    const world = readFile();
    world.money = 1000;
    writeFile(world);

    const res = await gql(
      `mutation { acheterQtProduit(user: "${user}", id: 1, quantite: 10) { id quantite cout } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    const product = res.body.data.acheterQtProduit;
    expect(product.quantite).toBe(11);
    // cout = 4 * 1.07^10 ; total payé = 4 * (1.07^10 - 1) / 0.07 ≈ 55.27
    expect(product.cout).toBeCloseTo(7.87, 2);
    expect(readFile().money).toBeCloseTo(944.73, 2);
  });

  it("acheterQtProduit sur un id inconnu renvoie l'erreur du service", async () => {
    const res = await gql(
      `mutation { acheterQtProduit(user: "${user}", id: 99, quantite: 1) { id } }`,
    ).expect(200);

    expect(res.body.data.acheterQtProduit).toBeNull();
    expect(res.body.errors[0].message).toBe(
      "Le produit avec l'id 99 n'existe pas",
    );
  });

  it("engagerManager refuse si l'argent manque", async () => {
    // Manager 1 coûte 1000 $, le joueur n'en a plus que ≈ 944.73.
    const res = await gql(
      `mutation { engagerManager(user: "${user}", name: "Manager 1") { name unlocked } }`,
    ).expect(200);

    expect(res.body.data.engagerManager).toBeNull();
    expect(res.body.errors[0].message).toBe("Pas assez d'argent");
    expect(readFile().managers[0].unlocked).toBe(false);
  });

  it("engagerManager refuse si le produit cible n'a aucun exemplaire", async () => {
    // Manager 2 (15 000 $) cible Item 2, à quantite 0 dans un monde neuf : l'argent ne suffit
    // pas à passer outre (D24). Rien n'est débité, aucun flag ne change.
    writeFile({ ...readFile(), money: 20000 });
    const res = await gql(
      `mutation { engagerManager(user: "${user}", name: "Manager 2") { name unlocked } }`,
    ).expect(200);

    expect(res.body.data.engagerManager).toBeNull();
    expect(res.body.errors[0].message).toBe(
      "Aucun exemplaire de Item 2 : achetez le produit avant d'engager son manager",
    );
    const saved = readFile();
    expect(saved.money).toBe(20000);
    expect(saved.managers[1].unlocked).toBe(false);
    expect(saved.products[1].managerUnlocked).toBe(false);
  });

  it("basculerManager refuse si aucun manager n'est engagé pour le produit", async () => {
    const res = await gql(
      `mutation { basculerManager(user: "${user}", id: 1) { id managerUnlocked } }`,
    ).expect(200);

    expect(res.body.data.basculerManager).toBeNull();
    expect(res.body.errors[0].message).toBe('Aucun manager engagé pour Item 1');
    expect(readFile().products[0].managerUnlocked).toBe(false);
  });

  it("basculerManager met l'automatisation en pause sans toucher au palier manager", async () => {
    const world = readFile();
    world.money = 1000;
    writeFile(world);

    const hire = await gql(
      `mutation { engagerManager(user: "${user}", name: "Manager 1") { name unlocked } }`,
    ).expect(200);
    expect(hire.body.errors).toBeUndefined();
    expect(hire.body.data.engagerManager.unlocked).toBe(true);
    expect(readFile().products[0].managerUnlocked).toBe(true);

    const res = await gql(
      `mutation { basculerManager(user: "${user}", id: 1) { id managerUnlocked } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.basculerManager.managerUnlocked).toBe(false);
    const saved = readFile();
    expect(saved.products[0].managerUnlocked).toBe(false);
    // Le manager reste acheté (pas de remboursement, D20).
    expect(saved.managers[0].unlocked).toBe(true);
  });

  it('en pause, la production entamée finit puis plus rien ; la reprise réactive la boucle', async () => {
    // Sans dépendre de l'horloge : production à 300 ms de la fin, dernière évolution il y a 2 s.
    const world = readFile();
    world.products[0].timeleft = 300;
    world.lastupdate = Date.now() - 2000;
    writeFile(world);
    const before = world.money;
    // quantite vaut 11 depuis le cas d'achat, revenu a pu être modifié par un unlock : lus dans le fichier.
    const gain = world.products[0].quantite * world.products[0].revenu;

    const res = await gql(
      `query { getWorld(user: "${user}") { money products { id timeleft managerUnlocked } } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    // Branche « sans manager » : exactement une production (300 ≤ 2000), puis timeleft 0.
    expect(res.body.data.getWorld.money).toBeCloseTo(before + gain, 6);
    expect(res.body.data.getWorld.products[0].timeleft).toBe(0);
    expect(res.body.data.getWorld.products[0].managerUnlocked).toBe(false);

    const resume = await gql(
      `mutation { basculerManager(user: "${user}", id: 1) { id managerUnlocked } }`,
    ).expect(200);
    expect(resume.body.errors).toBeUndefined();
    expect(resume.body.data.basculerManager.managerUnlocked).toBe(true);
    expect(readFile().products[0].managerUnlocked).toBe(true);
  });

  it('resetWorld repart du monde initial et crédite floor(score / 50) anges (D20)', async () => {
    // Le score du monde jetable est trop bas pour être discriminant : on le fixe dans le fichier.
    const before = readFile();
    before.score = 5000;
    before.totalangels = 0;
    before.activeangels = 0;
    writeFile(before);

    const res = await gql(
      `mutation { resetWorld(user: "${user}") { money score totalangels activeangels products { id quantite } } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    const world = res.body.data.resetWorld;
    expect(world.money).toBe(0);
    expect(world.score).toBe(5000);
    expect(world.totalangels).toBe(100);
    expect(world.activeangels).toBe(100);
    expect(world.products[0].quantite).toBe(1);

    const saved = readFile();
    expect(saved.money).toBe(0);
    expect(saved.score).toBe(5000);
    expect(saved.totalangels).toBe(100);
    expect(saved.activeangels).toBe(100);
    expect(saved.products[0].quantite).toBe(1);
  });
});
