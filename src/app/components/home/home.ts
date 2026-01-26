import { Component } from '@angular/core';
import { Navigation } from '../navigation/navigation';
import { Hero } from '../hero/hero';
import { Products } from '../products/products';
import { Stats } from '../stats/stats';
import { Testimonial } from '../testimonial/testimonial';
import { Footer } from '../footer/footer';
import { FloatingActions } from '../floating-actions/floating-actions';

@Component({
  selector: 'app-home',
  imports: [Navigation, Hero, Products, Stats, Testimonial, Footer, FloatingActions],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

}
