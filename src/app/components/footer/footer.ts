import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {

  constructor(private router: Router) {}

  navigateToShop() {
    this.router.navigate(['/shop']).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  navigateToFaq() {
    this.router.navigate(['/faq']).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
