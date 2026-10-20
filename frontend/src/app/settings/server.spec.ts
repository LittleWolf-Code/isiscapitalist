import { DEFAULT_SERVER, SERVER_STORAGE_KEY, normalizeServerUrl, readStoredServer } from './server';

describe('server.ts (F-34, D41)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adresse par défaut en mode dev : http://localhost:3000/', () => {
    expect(DEFAULT_SERVER).toBe('http://localhost:3000/');
  });

  it.each([
    ['  https://capitalist.lucaslopvet.fr  ', 'https://capitalist.lucaslopvet.fr/'],
    ['http://localhost:3000', 'http://localhost:3000/'],
    ['https://autre-groupe.fr/api', 'https://autre-groupe.fr/api/'],
    ['https://autre-groupe.fr/api/?x=1#top', 'https://autre-groupe.fr/api/'],
    // Adresse de l'endpoint collée telle quelle (D49) : « graphql » final retiré.
    ['https://isiscapitalist.chl.connected-health.fr/graphql', 'https://isiscapitalist.chl.connected-health.fr/'],
    ['https://autre-groupe.fr/api/graphql/', 'https://autre-groupe.fr/api/'],
    ['https://autre-groupe.fr/mygraphql', 'https://autre-groupe.fr/mygraphql/'],
    ['localhost:3000', null],
    ['ftp://x.fr', null],
    ['', null],
  ])('normalizeServerUrl(%j) → %j', (raw, expected) => {
    expect(normalizeServerUrl(raw)).toBe(expected);
  });

  it('readStoredServer : adresse mémorisée valide, normalisée', () => {
    localStorage.setItem(SERVER_STORAGE_KEY, 'https://autre-groupe.fr');
    expect(readStoredServer()).toBe('https://autre-groupe.fr/');
  });

  it('readStoredServer : valeur invalide ou absente → adresse par défaut', () => {
    expect(readStoredServer()).toBe(DEFAULT_SERVER);
    localStorage.setItem(SERVER_STORAGE_KEY, 'pas une adresse');
    expect(readStoredServer()).toBe(DEFAULT_SERVER);
  });

  it('readStoredServer : localStorage qui lève → adresse par défaut', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('indisponible');
    });
    expect(readStoredServer()).toBe(DEFAULT_SERVER);
  });
});
