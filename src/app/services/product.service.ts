import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Product, ProductImage, ProductReview } from '../data/products.data';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
  timestamp: string;
};

type ProductDto = {
  id: number;
  name: string;
  image?: string | null;
  alt?: string | null;
  images?: ProductImageDto[] | null;
  originalPrice: number | null;
  salePrice: number | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  description: string;
  highlights: string[] | null;
  size: string | null;
  burnTime: string | null;
  scentFamily: string | null;
  collection: 'home' | 'shop' | null;
  reviews?: ProductReviewDto[] | null;
};

export type SubmitProductReviewRequest = {
  name: string;
  email?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
};

export type SubmitProductReviewResponse = {
  statusCode: number;
  message: string;
  body?: ProductReviewDto | null;
  timestamp?: string;
};

type ProductReviewDto = {
  id?: number | string | null;
  orderNumber?: string | null;
  productName?: string | null;
  author?: string | null;
  name?: string | null;
  userName?: string | null;
  customerName?: string | null;
  createdBy?: string | null;
  rating?: number | string | null;
  title?: string | null;
  content?: string | null;
  message?: string | null;
  review?: string | null;
  comment?: string | null;
  reviewText?: string | null;
  reviewMessage?: string | null;
  date?: string | null;
  createdAt?: string | null;
  createdDate?: string | null;
  updatedAt?: string | null;
  updatedDate?: string | null;
};

type ProductImageDto = {
  id: number;
  imageUrl: string;
  altText?: string | null;
  displayOrder?: number | null;
  isPrimary?: boolean | null;
};

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http
      .get<ApiResponse<ProductDto[]>>(`${environment.apiBaseUrl}/api/products`)
      .pipe(map((response) => response.body.map((item) => this.normalizeProduct(item))));
  }

  getProduct(id: number): Observable<Product | undefined> {
    return this.http
      .get<ApiResponse<ProductDto>>(`${environment.apiBaseUrl}/api/products/${id}`)
      .pipe(map((response) => this.normalizeProduct(response.body)));
  }

  getProductReviews(productId: number): Observable<ProductReview[]> {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/api/reviews/products/${productId}`)
      .pipe(
        map((response) => this.normalizeReviews(this.extractReviewList(response)))
      );
  }

  submitProductReview(productId: number, payload: SubmitProductReviewRequest): Observable<SubmitProductReviewResponse> {
    return this.http.post<SubmitProductReviewResponse>(
      `${environment.apiBaseUrl}/api/products/${productId}/reviews`,
      payload
    );
  }

  private normalizeProduct(dto: ProductDto): Product {
    const normalizedImages = this.normalizeImages(dto.images);
    const primaryImage = this.selectPrimaryImage(normalizedImages);

    return {
      id: dto.id,
      name: dto.name,
      image: primaryImage?.imageUrl ?? dto.image ?? '',
      images: normalizedImages,
      alt: primaryImage?.altText ?? dto.alt ?? dto.name,
      originalPrice: dto.originalPrice ?? undefined,
      salePrice: dto.salePrice ?? undefined,
      price: dto.price ?? undefined,
      rating: dto.rating ?? undefined,
      reviewCount: dto.reviewCount ?? undefined,
      description: dto.description,
      highlights: dto.highlights ?? [],
      size: dto.size ?? undefined,
      burnTime: dto.burnTime ?? undefined,
      scentFamily: dto.scentFamily ?? undefined,
      collection: dto.collection ?? undefined,
      reviews: this.normalizeReviews(dto.reviews)
    };
  }

  private normalizeImages(images: ProductImageDto[] | null | undefined): ProductImage[] {
    if (!images || images.length === 0) {
      return [];
    }

    return [...images]
      .filter((item) => !!item?.imageUrl)
      .sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0));
  }

  private selectPrimaryImage(images: ProductImage[]): ProductImage | undefined {
    if (images.length === 0) {
      return undefined;
    }

    return images.find((item) => item.isPrimary) ?? images[0];
  }

  private normalizeReviews(reviews: ProductReviewDto[] | null | undefined): ProductReview[] {
    if (!reviews || reviews.length === 0) {
      return [];
    }

    return reviews
      .filter((item) => !!item && typeof item === 'object')
      .map((item, index) => {
        const content = this.normalizeText(
          item.content ?? item.message ?? item.review ?? item.comment ?? item.reviewText ?? item.reviewMessage ?? ''
        );

        const title = this.normalizeText(item.title ?? item.productName ?? item.orderNumber ?? '') || 'Customer review';

        return {
          id: this.parseReviewId(item.id, index),
          author: this.normalizeText(item.author ?? item.name ?? item.userName ?? item.customerName ?? item.createdBy ?? 'Verified Buyer'),
          rating: this.parseRating(item.rating),
          title,
          content,
          date: this.formatDateOnly(item.date ?? item.createdAt ?? item.createdDate ?? item.updatedAt ?? item.updatedDate)
        };
      })
      .filter((item) => item.content.length > 0);
  }

  private extractReviewList(response: unknown): ProductReviewDto[] {
    if (Array.isArray(response)) {
      return response as ProductReviewDto[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const maybeEnvelope = response as ApiResponse<unknown> & { data?: unknown; reviews?: unknown };
    const body = maybeEnvelope.body ?? maybeEnvelope.data ?? maybeEnvelope.reviews;

    if (Array.isArray(body)) {
      return body as ProductReviewDto[];
    }

    if (body && typeof body === 'object') {
      const nestedItems = (body as { content?: unknown; items?: unknown; reviews?: unknown });
      const candidateList = nestedItems.content ?? nestedItems.items ?? nestedItems.reviews;

      if (Array.isArray(candidateList)) {
        return candidateList as ProductReviewDto[];
      }
    }

    return [];
  }

  private parseReviewId(value: number | string | null | undefined, index: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return index + 1;
  }

  private parseRating(value: number | string | null | undefined): number {
    const numericValue = typeof value === 'string' ? Number(value) : value ?? NaN;
    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.max(0, Math.min(5, numericValue));
  }

  private normalizeText(value: string | null | undefined): string {
    return String(value ?? '').trim();
  }

  private formatDateOnly(value: string | null | undefined): string {
    const raw = this.normalizeText(value);
    if (!raw) {
      return '';
    }

    // Keep only the date part for ISO-like strings such as 2026-06-21T16:21:04.809056.
    const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
      return isoDateMatch[1];
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return raw;
  }
}
