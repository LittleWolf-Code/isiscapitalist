import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AngelsPanel } from './angels-panel';

@Component({
  standalone: true,
  imports: [AngelsPanel],
  template: `
    <app-angels-panel
      [score]="4e15"
      [totalangels]="100"
      [activeangels]="60"
      [angelbonus]="2"
      [angelsEarned]="earned()"
      (resetRequested)="resets = resets + 1"
    />
  `,
})
class Host {
  readonly earned = signal(200);
  resets = 0;
}

describe('AngelsPanel (fenêtre Investors, F-29)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('anges actifs, total, bonus par ange et score', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const pairs = Array.from(el.querySelectorAll('dt')).map(
      (dt) => `${dt.textContent!.trim()}=${dt.nextElementSibling!.textContent!.trim()}`,
    );
    expect(pairs).toEqual([
      'Anges actifs=60',
      'Total des anges=100',
      'Bonus par ange=2 %',
      'Score=4.000 × 1015',
    ]);
  });

  it('bouton de reset : anges à réclamer, jamais désactivé (même à 0), émet resetRequested', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button.reset') as HTMLButtonElement;
    expect(button.querySelector('.earned')?.textContent).toBe('200 anges');
    expect(button.querySelector('.claim')?.textContent).toBe('à réclamer avec un reset');
    fixture.componentInstance.earned.set(0);
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    button.click();
    expect(fixture.componentInstance.resets).toBe(1);
  });
});
