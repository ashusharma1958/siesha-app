import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartComponent } from '../cart/cart';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, CartComponent],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.css'],
})
export class Navigation {

}
