import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameIcon } from './game-icon';
import { SERVER } from './server';
import { clearPipboyCache } from './pixel-art';

// Hôte de test : la liste de candidats et le mode Pip-Boy sont des signaux pour les remplacer.
// Sous jsdom (pas de canvas 2D), pipboyDataUrl résout l'URL d'origine : les tests « par défaut »
// voient donc le même src qu'en mode couleur, avec la classe pixel en plus (D35).
@Component({
  standalone: true,
  imports: [GameIcon],
  template: `<app-game-icon [candidates]="candidates()" [pixelIcons]="pixelIcons()" alt="Manager 1" />`,
})
class Host {
  readonly candidates = signal<readonly string[]>(['icones/manager1.png', 'icones/item1.png']);
  readonly pixelIcons = signal(true);
}

// jsdom ne charge pas les images : l'échec est simulé par dispatchEvent(new Event('error')).
function img(fixture: { nativeElement: unknown }): HTMLImageElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('img');
}

describe('GameIcon', () => {
  beforeEach(async () => {
    clearPipboyCache();
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('affiche le premier candidat, préfixé par l’adresse du serveur (SERVER), avec alt', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const image = img(fixture)!;
    expect(image.getAttribute('src')).toBe(SERVER() + 'icones/manager1.png');
    expect(image.getAttribute('src')).toBe('http://localhost:3000/icones/manager1.png');
    expect(image.getAttribute('alt')).toBe('Manager 1');
  });

  it('error → second candidat ; second error → plus aucun <img>, hôte toujours présent', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(SERVER() + 'icones/item1.png');

    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-game-icon')).not.toBeNull();
  });

  it('liste vide → aucun <img>', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.candidates.set([]);
    await fixture.whenStable();
    expect(img(fixture)).toBeNull();
  });

  it('changement de candidates → retour au premier de la nouvelle liste', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    img(fixture)!.dispatchEvent(new Event('error'));
    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)).toBeNull();

    fixture.componentInstance.candidates.set(['icones/world.png']);
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(SERVER() + 'icones/world.png');
  });

  it('même contenu dans un nouveau tableau → index conservé (pas de nouvel essai à chaque tick)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(SERVER() + 'icones/item1.png');

    fixture.componentInstance.candidates.set(['icones/manager1.png', 'icones/item1.png']);
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(SERVER() + 'icones/item1.png');
  });

  it("pixelIcons faux → src d'origine, sans la classe pixel", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.pixelIcons.set(false);
    await fixture.whenStable();
    const image = img(fixture)!;
    expect(image.getAttribute('src')).toBe(SERVER() + 'icones/manager1.png');
    expect(image.classList.contains('pixel')).toBe(false);
  });

  it("pixelIcons vrai sous jsdom → après résolution, src d'origine (repli) et classe pixel", async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const image = img(fixture)!;
    expect(image.getAttribute('src')).toBe(SERVER() + 'icones/manager1.png');
    expect(image.classList.contains('pixel')).toBe(true);

    fixture.componentInstance.pixelIcons.set(false);
    await fixture.whenStable();
    expect(img(fixture)!.classList.contains('pixel')).toBe(false);
  });

  // Simule un navigateur : canvas 2D « présent » et Image qui échoue → pipboyDataUrl rejette.
  describe('échec de pipboyDataUrl (image introuvable)', () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    const originalImage = globals['Image'];
    const originalContext = globals['CanvasRenderingContext2D'];
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    class FailingImage {
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }

    beforeEach(() => {
      globals['Image'] = FailingImage;
      globals['CanvasRenderingContext2D'] = class {};
      HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof originalGetContext;
    });
    afterEach(() => {
      globals['Image'] = originalImage;
      globals['CanvasRenderingContext2D'] = originalContext;
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('rejet → candidat suivant, puis plus aucun <img> quand la liste est épuisée', async () => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.candidates.set(['icones/manager1.png']);
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(img(fixture)).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('app-game-icon')).not.toBeNull();

      // En mode couleur, le même candidat s'affiche sans passer par pipboyDataUrl.
      fixture.componentInstance.pixelIcons.set(false);
      fixture.componentInstance.candidates.set(['icones/item1.png']);
      await fixture.whenStable();
      expect(img(fixture)!.getAttribute('src')).toBe(SERVER() + 'icones/item1.png');
    });
  });
});
