import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [
    trigger('routeFade', [
      transition('* <=> *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('280ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class App {
  protected readonly title = signal('siesha-app');

  prepareRoute(outlet: RouterOutlet) {
    if (!outlet || !outlet.isActivated) {
      return undefined;
    }

    return outlet.activatedRouteData?.['animation'] || outlet.activatedRoute?.routeConfig?.path;
  }
}
