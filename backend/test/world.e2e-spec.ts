import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module.js';
import { World } from '../src/graphql.js';
import { origworld } from '../src/origworld.js';

// Test de bout en bout : HTTP → Apollo → resolver → fichier userworlds/<user>-world.json.
// Un seul AppModule pour toute la suite (beforeAll) : son init régénère src/graphql.ts, inutile de
// le refaire à chaque cas. Utilisateur jetable, fichier supprimé en afterAll.
// Les cas sont ordonnés : chacun repart de l'état laissé par le précédent.
// saveWorld est synchrone (D8) : lire le fichier juste après la réponse est fiable.
// Les noms (monde, managers, produits) sont lus dans origworld : le thème du monde peut changer
// sans casser la suite.
describe('World GraphQL API (e2e)', () => {
  let app: INestApplication<App>;
  const user = `e2e-${Date.now()}`;
  const userworlds = path.join(process.cwd(), 'userworlds');
  const worldFile = path.join(userworlds, `${user}-world.json`);
  // Pseudo hostile du cas « chemin de fichier » : sans encodage, il écrirait dans backend/.
  const stamp = Date.now();
  const escapeUser = `../e2e-escape-${stamp}`;
  const escapedFile = path.join(process.cwd(), `e2e-escape-${stamp}-world.json`);
  const confinedFile = path.join(
    userworlds,
    `${encodeURIComponent(escapeUser)}-world.json`,
  );
  const manager1 = origworld.managers[0];
  const manager2 = origworld.managers[1];

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
    for (const file of [worldFile, escapedFile, confinedFile]) {
      fs.rmSync(file, { force: true });
    }
  });

  it('getWorld crée le fichier du joueur à partir du monde initial', async () => {
    const res = await gql(
      `query { getWorld(user: "${user}") { name money products { id quantite } } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.getWorld.name).toBe(origworld.name);
    expect(fs.existsSync(worldFile)).toBe(true);
    expect(readFile().name).toBe(origworld.name);
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

  it("acheterQtProduit sur un id inconnu renvoie l'erreur du sujet", async () => {
    const res = await gql(
      `mutation { acheterQtProduit(user: "${user}", id: 99, quantite: 1) { id } }`,
    ).expect(200);

    expect(res.body.data.acheterQtProduit).toBeNull();
    expect(res.body.errors[0].message).toBe(
      "Le produit avec l'id 99 n'existe pas",
    );
  });

  it("engagerManager refuse si l'argent manque", async () => {
    // Le premier manager coûte 1000 $, le joueur n'en a plus que ≈ 944.73.
    const res = await gql(
      `mutation { engagerManager(user: "${user}", name: "${manager1.name}") { name unlocked } }`,
    ).expect(200);

    expect(res.body.data.engagerManager).toBeNull();
    expect(res.body.errors[0].message).toBe("Pas assez d'argent");
    expect(readFile().managers[0].unlocked).toBe(false);
  });

  it("engagerManager refuse si le produit cible n'a aucun exemplaire (D42)", async () => {
    // Le deuxième manager cible le produit 2, à quantite 0 dans un monde neuf.
    writeFile({ ...readFile(), money: 20000 });
    const product2 = origworld.products[1];
    const res = await gql(
      `mutation { engagerManager(user: "${user}", name: "${manager2.name}") { name unlocked } }`,
    ).expect(200);

    expect(res.body.data.engagerManager).toBeNull();
    expect(res.body.errors[0].message).toBe(
      `Aucun exemplaire de ${product2.name} : achetez le produit avant d'engager son manager`,
    );
    const saved = readFile();
    expect(saved.money).toBe(20000);
    expect(saved.managers[1].unlocked).toBe(false);
    expect(saved.products[1].managerUnlocked).toBe(false);
  });

  it('lancerProductionProduit affecte vitesse à timeleft, même à 0 exemplaire (B-10)', async () => {
    const res = await gql(
      `mutation { lancerProductionProduit(user: "${user}", id: 3) { id quantite timeleft vitesse } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    const product = res.body.data.lancerProductionProduit;
    expect(product.quantite).toBe(0);
    expect(product.timeleft).toBe(product.vitesse);
  });

  it("basculerManager n'existe plus : le schéma est celui du sujet (D36)", async () => {
    const res = await gql(
      `mutation { basculerManager(user: "${user}", id: 1) { id } }`,
    );

    expect(res.body.data).toBeUndefined();
    expect(res.body.errors[0].message).toContain('basculerManager');
  });

  it('un pseudo contenant « ../ » reste dans userworlds/ (D36)', async () => {
    const res = await gql(
      `query { getWorld(user: "${escapeUser}") { name } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(fs.existsSync(escapedFile)).toBe(false);
    expect(fs.existsSync(confinedFile)).toBe(true);
  });

  it('resetWorld repart du monde initial et crédite 150 × √(score / 10¹⁵) anges (RG-09)', async () => {
    // Le score du monde jetable est trop bas pour être discriminant : on le fixe dans le fichier.
    // 4·10¹⁵ → 150 × 2 = 300 anges.
    const before = readFile();
    before.score = 4e15;
    before.totalangels = 0;
    before.activeangels = 0;
    writeFile(before);

    const res = await gql(
      `mutation { resetWorld(user: "${user}") { money score totalangels activeangels products { id quantite } } }`,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    const world = res.body.data.resetWorld;
    expect(world.money).toBe(0);
    expect(world.score).toBe(4e15);
    expect(world.totalangels).toBe(300);
    expect(world.activeangels).toBe(300);
    expect(world.products[0].quantite).toBe(1);

    const saved = readFile();
    expect(saved.money).toBe(0);
    expect(saved.score).toBe(4e15);
    expect(saved.totalangels).toBe(300);
    expect(saved.activeangels).toBe(300);
    expect(saved.products[0].quantite).toBe(1);
    expect(saved.managers.every((m) => !m.unlocked)).toBe(true);
  });

  it('changerFormuleAnges change le diviseur du compte, gardé au reset (D43)', async () => {
    const res = await gql(
      `mutation { changerFormuleAnges(user: "${user}", diviseur: 1000000) { angeldivisor totalangels } }`,
    ).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.changerFormuleAnges.angeldivisor).toBe(1e6);
    expect(readFile().angeldivisor).toBe(1e6);

    // Score 4·10⁶ avec le diviseur 10⁶ → 300 anges acquis, dont 0 déjà distribué.
    const before = readFile();
    before.score = 4e6;
    before.totalangels = 0;
    before.activeangels = 0;
    writeFile(before);
    const reset = await gql(
      `mutation { resetWorld(user: "${user}") { totalangels activeangels angeldivisor } }`,
    ).expect(200);
    expect(reset.body.data.resetWorld).toEqual({
      totalangels: 300,
      activeangels: 300,
      angeldivisor: 1e6,
    });
  });

  it('changerFormuleAnges refuse un diviseur nul ou négatif', async () => {
    const res = await gql(
      `mutation { changerFormuleAnges(user: "${user}", diviseur: 0) { angeldivisor } }`,
    ).expect(200);
    expect(res.body.errors[0].message).toBe(
      'Le diviseur doit être un nombre strictement positif',
    );
    expect(readFile().angeldivisor).toBe(1e6);
  });

  it("un monde sauvegardé sans angeldivisor (avant D43) reçoit celui du sujet", async () => {
    const old = readFile() as Partial<World>;
    delete old.angeldivisor;
    writeFile(old as World);
    const res = await gql(`query { getWorld(user: "${user}") { angeldivisor } }`).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.getWorld.angeldivisor).toBe(1e15);
  });
});
