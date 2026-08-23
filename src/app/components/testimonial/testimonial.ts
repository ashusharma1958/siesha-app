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

  // Shown until real user reviews exceed 4; then actual reviews take over.
  private readonly fallbackReviews: TestimonialReview[] = [
    {
      id: -1,
      productId: -1,
      productName: 'Dhyana',
      author: 'Mdeepali',
      rating: 5,
      title: 'In love with Siesha',
      content: 'I\u2019m absolutely in love with Siesha! Tried all their scented candles\u2014my favourite has to be Sandalwood. Good product at a good price.',
      date: '2026-07-30'
    },
    {
      id: -2,
      productId: -2,
      productName: 'Vara and Dhyana',
      author: 'Harshit Maroo',
      rating: 5,
      title: 'Smells amazing',
      content: 'Your candles smell amazing\u2014so soothing and natural. Loved both the Mogra and Sandalwood. Will definitely shop again!',
      date: '2026-07-29'
    },
    {
      id: -3,
      productId: -3,
      productName: 'Nirvaan',
      author: 'Anshika Mittal',
      rating: 5,
      title: 'Felt like home',
      content: 'Came home after the weekend. That cozy scent of Aqua candle instantly made it feel like home again.',
      date: '2026-07-28'
    },
    {
      id: -4,
      productId: -4,
      productName: 'Bloom Gift Set',
      author: 'Peehu Gupta',
      rating: 5,
      title: 'Absolutely obsessed',
      content: 'Absolutely obsessed with my Siesha candles! Velvet Rose is floral and romantic, Aqua is fresh and airy, Vanilla Dusk is warm and creamy, and Sandalwood is beautifully grounding. The fragrance lingers perfectly\u2014never too strong, just right.',
      date: '2026-07-27'
    },
    {
      id: -5,
      productId: -5,
      productName: 'Citrus Sundaze',
      author: 'Riya',
      rating: 5,
      title: 'Pretty amazing',
      content: ' Really love this one. It has that fresh, slightly citrusy smell that makes the whole room feel clean and peaceful.',
      date: '2026-08-11'
    },
    {
      id: -6,
      productId: 1,
      productName: 'Zesty Daydream',
      author: 'Yuvika ',
      rating: 5,
      title: 'Soothing and refreshing',
      content: 'I light this in the morning and the fragrance makes the room feel fresh and energetic. One of my favourites.',
      date: '2026-05-06'
    }
  ];

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
          this.reviews = this.fallbackReviews;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.initSwiperIfReady();
          return;
        }

        const reviewRequests = products.map((product) =>
          this.productService.getProductReviews(product.id).pipe(
            catchError(() => of([] as ProductReview[]))
          )
        );

        forkJoin(reviewRequests).subscribe({
          next: (reviewsPerProduct) => {
            const realReviews = reviewsPerProduct
              .flatMap((productReviews, index) => {
                const product = products[index];
                return productReviews.map((review) => ({
                  ...review,
                  productId: product.id,
                  productName: product.name
                }));
              })
              .filter((review) => review.rating > 3)
              .sort((a, b) => {
                // Sort by latest date first when available.
                const aTime = a.date ? Date.parse(a.date) : 0;
                const bTime = b.date ? Date.parse(b.date) : 0;
                return bTime - aTime;
              });

            // Use real reviews only once they exceed 4; otherwise show fallbacks.
            this.reviews = realReviews.length > 4 ? realReviews : this.fallbackReviews;

            this.isLoading = false;
            this.cdr.detectChanges();
            this.initSwiperIfReady();
          },
          error: () => {
            this.reviews = this.fallbackReviews;
            this.isLoading = false;
            this.cdr.detectChanges();
            this.initSwiperIfReady();
          }
        });
      },
      error: () => {
        this.reviews = this.fallbackReviews;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.initSwiperIfReady();
      }
    });
  }

}
