import { Component } from '@angular/core';

@Component({
  selector: 'app-checkout',
  standalone: true,
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent {
  constructor() {}

  toggleBilling(show: boolean) {
    const form = document.getElementById('billingForm');
    if (form) {
      if (show) {
        form.classList.remove('d-none');
      } else {
        form.classList.add('d-none');
      }
    }
  }
}
