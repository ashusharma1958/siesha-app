import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Shop } from './components/shop/shop';
import { Faq } from './components/faq/faq';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking';
import { ProductDetail } from './components/product-detail/product-detail';
import { AboutUs } from './components/about-us/about-us';
import { ContactUs } from './components/contact-us/contact-us';
import { SignInComponent } from './components/sign-in/sign-in';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback';
import { SignUpComponent } from './components/sign-up/sign-up';
import { ProfileComponent } from './components/profile/profile';
import { AdminOrdersComponent } from './components/admin-orders/admin-orders';
import { VoucherManagementComponent } from './components/voucher-management/voucher-management';
import { AdminQueriesComponent } from './components/admin-queries/admin-queries';

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
    path: 'products',
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
    path: 'products/:id',
    component: ProductDetail
  },
  {
    path: 'about-us',
    component: AboutUs
  },
  {
    path: 'contact-us',
    component: ContactUs
  },
  {
    path: 'sign-in',
    component: SignInComponent
  },
  {
    path: 'sign-up',
    component: SignUpComponent
  },
  {
    path: 'profile',
    component: ProfileComponent
  },
  {
    path: 'admin/orders',
    component: AdminOrdersComponent
  },
  {
    path: 'admin/vouchers',
    component: VoucherManagementComponent
  },
  {
    path: 'admin/queries',
    component: AdminQueriesComponent
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent
  }
];
