import { Component } from '@angular/core';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  constructor() {}

  ngAfterViewInit() {
    // Quantity button handler
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
    });
  }
}
