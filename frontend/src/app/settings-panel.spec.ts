import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsPanel } from './settings-panel';

// Hôte de test : trois signaux liés en two-way, comme App avec GameService.
@Component({
  standalone: true,
  imports: [SettingsPanel],
  template: `
    <app-settings-panel [(scanlines)]="scanlines" [(glow)]="glow" [(flicker)]="flicker" />
  `,
})
class Host {
  readonly scanlines = signal(true);
  readonly glow = signal(true);
  readonly flicker = signal(false);
}

describe('SettingsPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  function toggles(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('mat-slide-toggle'));
  }
  function buttons(el: HTMLElement): HTMLButtonElement[] {
    return toggles(el).map((t) => t.querySelector<HTMLButtonElement>('button[role="switch"]')!);
  }

  it('affiche le titre et 3 interrupteurs reflétant les modèles (on, on, off)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Paramètres');
    expect(toggles(el).map((t) => t.textContent?.trim())).toEqual(['Scanlines', 'Halo', 'Scintillement']);
    expect(buttons(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false']);
    expect(el.textContent).toContain('ignoré si votre système réduit les animations');
  });

  it('clic sur un interrupteur → modèle mis à jour', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    buttons(el)[0].click();
    buttons(el)[2].click();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect([host.scanlines(), host.glow(), host.flicker()]).toEqual([false, true, true]);
    expect(buttons(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'true']);
  });
});
