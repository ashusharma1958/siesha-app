import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';

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
export class Testimonial implements OnInit {
  isLoading = true;
  reviews: TestimonialReview[] = [];

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllReviews();
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
