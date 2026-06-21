import { Component, OnDestroy, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { Navigation as SwiperNavigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import { Product, ProductImage, ProductReview } from '../../data/products.data';
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
  productReviews: ProductReview[] = [];
  fullStars: number[] = [];
  emptyStars: number[] = [];
  quantity = 1;
  viewReady = false;
  gallerySwiper: Swiper | undefined;
  reviewSwiper: Swiper | undefined;

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
          this.productReviews = this.resolveReviews(item);
          this.loadActualReviews(id);
          this.updateStars();
          this.cdr.detectChanges();
          this.initSwiperIfReady();
        },
        error: (error) => {
          console.error('Failed to load product detail', error);
          this.product = undefined;
          this.galleryImages = [];
          this.productReviews = [];
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
    this.gallerySwiper?.destroy(true, true);
    this.gallerySwiper = undefined;
    this.reviewSwiper?.destroy(true, true);
    this.reviewSwiper = undefined;
  }

  get displayPrice(): number | undefined {
    if (!this.product) {
      return undefined;
    }

    return this.product.salePrice ?? this.product.price ?? undefined;
  }

  get formattedDescription(): string {
    if (!this.product?.description) {
      return '';
    }

    return this.product.description
      .replace(/\\n/g, '\n')
      .replace(/\/n/g, '\n');
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

  trackByReview(index: number, review: ProductReview): number {
    return review.id ?? index;
  }

  getReviewFilledStars(review: ProductReview): number[] {
    return Array.from({ length: Math.min(Math.max(Math.round(review.rating ?? 0), 0), 5) }, (_, index) => index);
  }

  getReviewEmptyStars(review: ProductReview): number[] {
    return Array.from({ length: Math.max(5 - Math.min(Math.max(Math.round(review.rating ?? 0), 0), 5), 0) }, (_, index) => index);
  }

  private initSwiperIfReady() {
    this.initGallerySwiperIfReady();
    this.initReviewSwiperIfReady();
  }

  private initGallerySwiperIfReady() {
    if (!this.viewReady || !this.detailSwiperContainer || this.galleryImages.length === 0) {
      return;
    }

    setTimeout(() => {
      if (!this.detailSwiperContainer) {
        return;
      }

      if (this.gallerySwiper) {
        this.gallerySwiper.destroy(true, true);
        this.gallerySwiper = undefined;
      }

      this.gallerySwiper = new Swiper(this.detailSwiperContainer.nativeElement, {
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

  private initReviewSwiperIfReady() {
    if (!this.viewReady || !this.productReviews.length) {
      return;
    }

    const reviewContainer = document.querySelector('.review-swiper') as HTMLElement | null;
    if (!reviewContainer) {
      return;
    }

    setTimeout(() => {
      if (!reviewContainer) {
        return;
      }

      if (this.reviewSwiper) {
        this.reviewSwiper.destroy(true, true);
        this.reviewSwiper = undefined;
      }

      this.reviewSwiper = new Swiper(reviewContainer, {
        modules: [Autoplay],
        slidesPerView: 1,
        spaceBetween: 18,
        loop: this.productReviews.length > 1,
        autoplay: this.productReviews.length > 1
          ? {
              delay: 2500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }
          : false,
        breakpoints: {
          640: {
            slidesPerView: 1.15,
            spaceBetween: 18
          },
          900: {
            slidesPerView: 2,
            spaceBetween: 20
          },
          1200: {
            slidesPerView: 3,
            spaceBetween: 22
          }
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

  private resolveReviews(item: Product | undefined): ProductReview[] {
    if (!item) {
      return [];
    }

    return item.reviews ?? [];
  }

  private loadActualReviews(productId: number): void {
    this.productService.getProductReviews(productId).subscribe({
      next: (reviews) => {
        this.productReviews = reviews;

        if (this.reviewSwiper && reviews.length === 0) {
          this.reviewSwiper.destroy(true, true);
          this.reviewSwiper = undefined;
        }

        this.cdr.detectChanges();
        this.initReviewSwiperIfReady();
      },
      error: () => {
        this.productReviews = this.product?.reviews ?? [];
        this.cdr.detectChanges();
        this.initReviewSwiperIfReady();
      }
    });
  }
}
