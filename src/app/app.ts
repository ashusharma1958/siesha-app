import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [
    trigger('routeFade', [
      transition('* <=> *', [
        style({ opacity: 0 }),
        animate('280ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class App {
  protected readonly title = signal('siesha-app');

  constructor(private router: Router) {
    this.releaseScrollLocks();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.releaseScrollLocks());
  }

  prepareRoute(outlet: RouterOutlet) {
    if (!outlet || !outlet.isActivated) {
      return undefined;
    }

    return outlet.activatedRouteData?.['animation'] || outlet.activatedRoute?.routeConfig?.path;
  }

  private releaseScrollLocks(): void {
    const bootstrapApi = (window as { bootstrap?: { Offcanvas?: { getInstance: (element: Element) => { hide: () => void } | null } } }).bootstrap;

    document.querySelectorAll('.offcanvas.show').forEach((element) => {
      bootstrapApi?.Offcanvas?.getInstance(element)?.hide();
      element.classList.remove('show');
      element.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.offcanvas-backdrop').forEach((element) => element.remove());

    document.body.classList.remove('offcanvas-open', 'modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('touch-action');
  }
}
