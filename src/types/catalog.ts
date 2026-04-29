export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  popular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface CatalogState {
  categories: Category[];
  products: Product[];
  businessHours: { open: string; close: string };
  whatsapp: string;
}
