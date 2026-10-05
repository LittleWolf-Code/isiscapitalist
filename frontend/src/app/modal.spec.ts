import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  standalone: true,
  imports: [Modal],
  template: `
    @if (open()) {
      <app-modal title="Managers" (closed)="open.set(false); closes = closes + 1">
        <p class="content">contenu projeté</p>
      </app-modal>
    }
  `,
})
class Host {
  readonly open = signal(true);
  closes = 0;
}

describe('Modal (fenêtre superposée, F-18)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('dialogue titré, contenu projeté, bouton Close', async () => {
    const { el } = await render();
    const dialog = el.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = el.querySelector(`#${dialog.getAttribute('aria-labelledby')}`);
    expect(title?.textContent?.trim()).toBe('Managers');
    expect(el.querySelector('.content')?.textContent).toBe('contenu projeté');
    expect(el.querySelector('button.closebutton')?.textContent?.trim()).toBe('Close');
  });

  it('se ferme par Close, par Échap et par un clic sur le fond', async () => {
    const { fixture, el } = await render();
    (el.querySelector('button.closebutton') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-modal')).toBeNull();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(el.querySelector('app-modal')).toBeNull();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    (el.querySelector('.backdrop') as HTMLElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-modal')).toBeNull();
    expect(fixture.componentInstance.closes).toBe(3);
  });
});
