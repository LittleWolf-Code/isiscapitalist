import { SOUND_FILES, SoundService } from './sound.service';

// Faux AudioContext : jsdom n'en a pas. Il enregistre les sources démarrées.
class FakeAudioContext {
  static last: FakeAudioContext;
  state = 'running';
  started: unknown[] = [];
  readonly destination = {};
  constructor() {
    FakeAudioContext.last = this;
  }
  createGain() {
    return { gain: { value: 1 }, connect: () => undefined };
  }
  createBufferSource() {
    const source = {
      buffer: null as unknown,
      connect: () => undefined,
      start: () => this.started.push(source.buffer),
    };
    return source;
  }
  decodeAudioData(data: ArrayBuffer) {
    return Promise.resolve({ decoded: data.byteLength });
  }
  resume() {
    return Promise.resolve();
  }
}

// Laisse finir fetch, la lecture de la réponse et le décodage (vraies tâches asynchrones).
async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('SoundService (D46)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sans AudioContext (jsdom) : play ne fait rien et ne lève pas', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(() => new SoundService().play('buy')).not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('charge le fichier une seule fois et le joue à chaque appel', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8))));
    vi.stubGlobal('fetch', fetchSpy);
    const sound = new SoundService();
    sound.play('buy');
    sound.play('buy');
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(SOUND_FILES.buy);
    expect(FakeAudioContext.last.started).toHaveLength(2);
  });

  it('son désactivé ou volume 0 : rien n\'est chargé ni joué', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const sound = new SoundService();
    sound.configure(false, 50);
    sound.play('buy');
    sound.configure(true, 0);
    sound.play('buy');
    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fichier introuvable : silence, sans erreur', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))));
    const sound = new SoundService();
    sound.play('palier');
    await flush();
    expect(FakeAudioContext.last.started).toHaveLength(0);
  });
});
