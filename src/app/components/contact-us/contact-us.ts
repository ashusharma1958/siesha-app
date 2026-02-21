import { Component } from '@angular/core';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-contact-us',
  imports: [Navigation, Footer],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css',
})
export class ContactUs {}
