import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Shop } from './components/shop/shop';
import { Faq } from './components/faq/faq';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking';
import { ProductDetail } from './components/product-detail/product-detail';
import { AboutUs } from './components/about-us/about-us';
import { ContactUs } from './components/contact-us/contact-us';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    component: Home
  },
  {
    path: 'shop',
    component: Shop
  },
  {
    path: 'faq',
    component: Faq
  },
  {
    path: 'checkout',
    component: CheckoutComponent
  },
  {
    path: 'order-tracking',
    component: OrderTrackingComponent
  },
  {
    path: 'product/:id',
    component: ProductDetail
  },
  {
    path: 'about-us',
    component: AboutUs
  },
  {
    path: 'contact-us',
    component: ContactUs
  }
];
