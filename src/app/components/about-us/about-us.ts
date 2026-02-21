import { Component } from '@angular/core';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-about-us',
  imports: [Navigation, Footer],
  templateUrl: './about-us.html',
  styleUrl: './about-us.css',
})
export class AboutUs {}
