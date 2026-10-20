// Effets sonores du jeu (D46, brief sonore « Nuka Capitalist ») : fichiers de public/sons/,
// joués par la Web Audio API plutôt que par des <audio> : un même son peut se superposer à
// lui-même (clics rapides) sans latence ni coupure. Le contexte audio n'est créé qu'au premier
// son, qui suit toujours un geste du joueur (clic) : les navigateurs refusent l'audio avant.
// Sans AudioContext (jsdom des specs, vieux navigateur) ou si un fichier manque, tout est
// silencieux sans erreur. Volume et activation viennent des réglages (DisplaySettings), posés par
// GameService via configure().
import { Injectable } from '@angular/core';

export type SoundName = 'production_start' | 'production_done' | 'buy' | 'palier' | 'ui_click';

// Chemins relatifs à la page : servis par `ng serve` en dev, par Nginx avec le build en production.
export const SOUND_FILES: Readonly<Record<SoundName, string>> = {
  production_start: 'sons/sfx_production_start.mp3',
  production_done: 'sons/sfx_production_done.mp3',
  buy: 'sons/sfx_buy.mp3',
  palier: 'sons/sfx_palier.mp3',
  ui_click: 'sons/sfx_ui_click.mp3',
};

@Injectable({ providedIn: 'root' })
export class SoundService {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  // Un chargement par son, partagé par les lectures suivantes ; null = fichier illisible.
  private readonly buffers = new Map<SoundName, Promise<AudioBuffer | null>>();
  private enabled = true;
  private volume = 0.5;

  // Réglages du joueur : `level` en 0-100 comme les autres curseurs de Paramètres.
  configure(enabled: boolean, level: number): void {
    this.enabled = enabled;
    this.volume = Math.min(100, Math.max(0, level)) / 100;
    if (this.gain) {
      this.gain.gain.value = this.volume;
    }
  }

  play(name: SoundName): void {
    if (!this.enabled || this.volume <= 0) {
      return;
    }
    const context = this.ensureContext();
    if (!context || !this.gain) {
      return;
    }
    // Contexte créé hors d'un geste (production terminée avant tout clic) : suspendu jusqu'au
    // prochain geste ; resume() échoue alors sans conséquence.
    if (context.state === 'suspended') {
      context.resume().catch(() => undefined);
    }
    const gain = this.gain;
    void this.load(context, name).then((buffer) => {
      if (!buffer) {
        return;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start();
    });
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    try {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.context.destination);
    } catch {
      this.context = null;
      this.gain = null;
    }
    return this.context;
  }

  private load(context: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(name);
    if (!buffer) {
      buffer = fetch(SOUND_FILES[name])
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(response.status)))
        .then((data) => context.decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(name, buffer);
    }
    return buffer;
  }
}
