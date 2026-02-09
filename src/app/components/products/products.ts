import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Import Swiper and modules
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { Product } from '../../data/products.data';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit, AfterViewInit {
  @ViewChild('swiperContainer', { static: false }) swiperContainer: any;

  products: Product[] = [];
  viewReady = false;

  constructor(
    private cart: CartService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  swiper: Swiper | undefined;

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (items) => {
        this.products = items.slice(0, 12);
        this.cdr.detectChanges();
        this.initSwiperIfReady();
      },
      error: (error) => {
        console.error('Failed to load products', error);
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.initSwiperIfReady();
  }

  initSwiperIfReady() {
    if (!this.viewReady || !this.swiperContainer || this.products.length === 0) {
      return;
    }

    setTimeout(() => {
      if (!this.swiperContainer) {
        return;
      }

      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = undefined;
      }

      this.swiper = new Swiper(this.swiperContainer.nativeElement, {
        modules: [Navigation, Pagination, Autoplay],
        slidesPerView: 1,
        spaceBetween: 20,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
        },
        loop: true,
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 40,
          },
        }
      });
    }, 0);
  }

  onSlideChange() {
    console.log('slide change');
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }

  prevSlide() {
    if (this.swiper) {
      this.swiper.slidePrev();
    }
  }

  nextSlide() {
    if (this.swiper) {
      this.swiper.slideNext();
    }
  }

  getDisplayPrice(product: Product): number | undefined {
    return product.salePrice ?? product.price ?? product.originalPrice ?? undefined;
  }

  addToCart(product: Product, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cart.addItem(product, 1);
    this.cart.openCart();
  }
}
