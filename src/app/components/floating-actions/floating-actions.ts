import { Component } from '@angular/core';

@Component({
  selector: 'app-floating-actions',
  imports: [],
  templateUrl: './floating-actions.html',
  styleUrl: './floating-actions.css',
})
export class FloatingActions {
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
