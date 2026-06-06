import { Component, OnDestroy, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { Navigation as SwiperNavigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import { Product, ProductImage } from '../../data/products.data';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink, Navigation, Footer],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  @ViewChild('detailSwiperContainer', { static: false }) detailSwiperContainer: any;

  product: Product | undefined;
  galleryImages: ProductImage[] = [];
  fullStars: number[] = [];
  emptyStars: number[] = [];
  quantity = 1;
  viewReady = false;
  swiper: Swiper | undefined;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private cart: CartService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;

      if (!idParam || Number.isNaN(id)) {
        this.product = undefined;
        this.updateStars();
        return;
      }

      this.productService.getProduct(id).subscribe({
        next: (item) => {
          this.product = item;
          this.galleryImages = this.resolveGalleryImages(item);
          this.updateStars();
          this.cdr.detectChanges();
          this.initSwiperIfReady();
        },
        error: (error) => {
          console.error('Failed to load product detail', error);
          this.product = undefined;
          this.galleryImages = [];
          this.updateStars();
          this.cdr.detectChanges();
        }
      });
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.initSwiperIfReady();
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.swiper?.destroy(true, true);
    this.swiper = undefined;
  }

  get displayPrice(): number | undefined {
    if (!this.product) {
      return undefined;
    }

    return this.product.salePrice ?? this.product.price ?? undefined;
  }

  formatScentFamily(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.replace(/_/g, ' ');
  }

  updateStars() {
    if (!this.product) {
      this.fullStars = [];
      this.emptyStars = [];
      return;
    }

    const rating = this.product.rating ?? 0;
    const rounded = Math.round(rating);
    this.fullStars = Array.from({ length: Math.min(rounded, 5) }, (_, index) => index);
    this.emptyStars = Array.from({ length: Math.max(5 - rounded, 0) }, (_, index) => index);
  }

  addToCart() {
    if (!this.product) {
      return;
    }

    this.cart.addItem(this.product, this.quantity);
    this.cart.openCart();
  }

  increaseQuantity() {
    this.quantity = Math.min(this.quantity + 1, 10);
  }

  decreaseQuantity() {
    this.quantity = Math.max(this.quantity - 1, 1);
  }

  trackByGalleryImage(index: number, image: ProductImage): number {
    return image.id ?? index;
  }

  private initSwiperIfReady() {
    if (!this.viewReady || !this.detailSwiperContainer || this.galleryImages.length === 0) {
      return;
    }

    setTimeout(() => {
      if (!this.detailSwiperContainer) {
        return;
      }

      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = undefined;
      }

      this.swiper = new Swiper(this.detailSwiperContainer.nativeElement, {
        modules: [SwiperNavigation, Autoplay],
        slidesPerView: 1,
        spaceBetween: 12,
        loop: this.galleryImages.length > 1,
        autoplay: this.galleryImages.length > 1
          ? {
              delay: 2500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }
          : false,
        navigation: {
          nextEl: '.detail-swiper-next',
          prevEl: '.detail-swiper-prev'
        }
      });
    }, 0);
  }

  private resolveGalleryImages(item: Product | undefined): ProductImage[] {
    if (!item) {
      return [];
    }

    if (item.images && item.images.length > 0) {
      return item.images;
    }

    if (item.image) {
      return [{
        id: item.id,
        imageUrl: item.image,
        altText: item.alt ?? item.name,
        displayOrder: 0,
        isPrimary: true
      }];
    }

    return [];
  }
}
