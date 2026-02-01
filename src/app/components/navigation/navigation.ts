import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartComponent } from '../cart/cart';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, CartComponent],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation {

}
