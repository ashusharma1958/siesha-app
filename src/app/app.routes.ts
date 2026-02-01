import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Shop } from './components/shop/shop';
import { Faq } from './components/faq/faq';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking';

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
  }
];
