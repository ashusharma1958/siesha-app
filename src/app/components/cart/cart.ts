import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  constructor(private router: Router) {}

  ngAfterViewInit() {
    // Quantity button handler and checkout navigation
    document.addEventListener("click", (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("qty-btn")) {
        const qtyEl = target.parentElement?.querySelector(".qty") as HTMLElement;
        if (qtyEl) {
          let qty = parseInt(qtyEl.innerText);

          if (target.innerText === "+" && qty < 10) qty++;
          if (target.innerText === "−" && qty > 1) qty--;

          qtyEl.innerText = qty.toString();
        }
      }
      // Navigate to checkout when user clicks the checkout button
      if (target.classList.contains("checkout-btn")) {
        // Close the cart offcanvas first so body scrolling isn't blocked
        const closeBtn = document.querySelector('#cartOffcanvas .btn-close') as HTMLElement | null;
        if (closeBtn) closeBtn.click();

        // Wait briefly for the offcanvas to hide, then navigate
        setTimeout(() => {
          this.router.navigate(['/checkout']).then(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }, 250);
      }
    });
  }
}
