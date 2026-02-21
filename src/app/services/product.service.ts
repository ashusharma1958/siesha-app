import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Product, ProductImage } from '../data/products.data';

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
      collection: dto.collection ?? undefined
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
}
