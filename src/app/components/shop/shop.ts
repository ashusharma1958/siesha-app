import { Component } from '@angular/core';
import { Navigation } from '../navigation/navigation';
import { ShopFilter } from '../shop-filter/shop-filter';
import { ProductGrid } from '../product-grid/product-grid';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-shop',
  imports: [Navigation, ShopFilter, ProductGrid, Footer],
  templateUrl: './shop.html',
  styleUrl: './shop.css',
})
export class Shop {

}
