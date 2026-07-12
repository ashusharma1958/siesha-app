import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';

// Import Swiper and modules
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { ProductReview } from '../../data/products.data';
import { ProductService } from '../../services/product.service';

type TestimonialReview = ProductReview & {
  productId: number;
  productName: string;
};

@Component({
  selector: 'app-testimonial',
  imports: [CommonModule],
  templateUrl: './testimonial.html',
  styleUrl: './testimonial.css',
})
export class Testimonial implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('swiperContainer', { static: false }) swiperContainer: any;

  isLoading = true;
  reviews: TestimonialReview[] = [];
  viewReady = false;
  swiper: Swiper | undefined;

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllReviews();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initSwiperIfReady();
  }

  ngOnDestroy(): void {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = undefined;
    }
  }

  private initSwiperIfReady(): void {
    if (!this.viewReady || !this.swiperContainer || this.reviews.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.swiperContainer) {
          return;
        }

        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = undefined;
        }

        this.swiper = new Swiper(this.swiperContainer.nativeElement, {
          modules: [Navigation, Pagination, Autoplay],
          observer: true,
          observeParents: true,
          observeSlideChildren: true,
          slidesPerView: 1,
          spaceBetween: 16,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          autoplay: {
            delay: 4000,
            disableOnInteraction: false,
          },
          loop: true,
          breakpoints: {
            768: {
              slidesPerView: 3,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 30,
            },
          }
        });

        this.swiper.update();
      });
    });
  }

  prevSlide(): void {
    if (this.swiper) {
      this.swiper.slidePrev();
    }
  }

  nextSlide(): void {
    if (this.swiper) {
      this.swiper.slideNext();
    }
  }

  trackByReview(index: number, review: TestimonialReview): string {
    return `${review.productId}-${review.id}-${index}`;
  }

  private loadAllReviews(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        if (!products.length) {
          this.reviews = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        const reviewRequests = products.map((product) =>
          this.productService.getProductReviews(product.id).pipe(
            catchError(() => of([] as ProductReview[]))
          )
        );

        forkJoin(reviewRequests).subscribe({
          next: (reviewsPerProduct) => {
            this.reviews = reviewsPerProduct
              .flatMap((productReviews, index) => {
                const product = products[index];
                return productReviews.map((review) => ({
                  ...review,
                  productId: product.id,
                  productName: product.name
                }));
              })
              .sort((a, b) => {
                // Sort by latest date first when available.
                const aTime = a.date ? Date.parse(a.date) : 0;
                const bTime = b.date ? Date.parse(b.date) : 0;
                return bTime - aTime;
              });

            this.isLoading = false;
            this.cdr.detectChanges();
            this.initSwiperIfReady();
          },
          error: () => {
            this.reviews = [];
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.reviews = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

}
