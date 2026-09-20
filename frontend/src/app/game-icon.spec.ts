import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameIcon, ICON_BASE_URL } from './game-icon';

// Hôte de test : la liste de candidats est un signal pour pouvoir la remplacer.
@Component({
  standalone: true,
  imports: [GameIcon],
  template: `<app-game-icon [candidates]="candidates()" alt="Manager 1" />`,
})
class Host {
  readonly candidates = signal<readonly string[]>(['icones/manager1.png', 'icones/item1.png']);
}

// jsdom ne charge pas les images : l'échec est simulé par dispatchEvent(new Event('error')).
function img(fixture: { nativeElement: unknown }): HTMLImageElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('img');
}

describe('GameIcon', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('affiche le premier candidat, préfixé par ICON_BASE_URL, avec alt', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const image = img(fixture)!;
    expect(image.getAttribute('src')).toBe(ICON_BASE_URL + 'icones/manager1.png');
    expect(image.getAttribute('src')).toBe('http://localhost:3000/icones/manager1.png');
    expect(image.getAttribute('alt')).toBe('Manager 1');
  });

  it('error → second candidat ; second error → plus aucun <img>, hôte toujours présent', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(ICON_BASE_URL + 'icones/item1.png');

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
    expect(img(fixture)!.getAttribute('src')).toBe(ICON_BASE_URL + 'icones/world.png');
  });

  it('même contenu dans un nouveau tableau → index conservé (pas de nouvel essai à chaque tick)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    img(fixture)!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(ICON_BASE_URL + 'icones/item1.png');

    fixture.componentInstance.candidates.set(['icones/manager1.png', 'icones/item1.png']);
    await fixture.whenStable();
    expect(img(fixture)!.getAttribute('src')).toBe(ICON_BASE_URL + 'icones/item1.png');
  });
});
