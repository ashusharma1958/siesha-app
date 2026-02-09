export type Product = {
  id: number;
  name: string;
  image: string;
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
};
