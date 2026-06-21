export type ProductImage = {
  id: number;
  imageUrl: string;
  altText?: string | null;
  displayOrder?: number | null;
  isPrimary?: boolean | null;
};

export type ProductReview = {
  id: number;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
};

export type Product = {
  id: number;
  name: string;
  image: string;
  images?: ProductImage[];
  alt?: string | null;
  originalPrice?: number | null;
  salePrice?: number | null;
  price?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  description: string;
  highlights?: string[] | null;
  size?: string | null;
  burnTime?: string | null;
  scentFamily?: string | null;
  collection?: 'home' | 'shop' | null;
  reviews?: ProductReview[] | null;
};
