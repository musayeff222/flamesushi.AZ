export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  popular?: boolean;
  /** Siyahıda və vitrin sırası (kiçik = əvvəl) */
  sortOrder?: number;
  /** Son endirim faizi (məlumat üçün, məs. 10) */
  discountPercent?: number;
  /** Məhsula xüsusi saat / çatdırılma qeydi */
  availabilityNote?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

/** Ana səhifə baner karuseli */
export interface SiteBanners {
  /** Karuseldə göstərilən şəkil URL-ləri (sıra ilə) */
  heroImageUrls: string[];
  /** Hər şəkilə uyğun vurğulanan məhsul ID (boş və ya qısa siyahı ola bilər) */
  featuredProductIds: string[];
  /** Slayt dəyişmə müddəti (saniyə) */
  carouselSeconds: number;
}

export interface PromoCodeEntry {
  id: string;
  code: string;
  discountPercent: number;
  /** Sayt səbətində qəbul olunur */
  activeOnWebsite: boolean;
  validFrom?: string;
  validTo?: string;
  note?: string;
  createdAt: string;
}

export interface CatalogState {
  categories: Category[];
  products: Product[];
  businessHours: { open: string; close: string };
  whatsapp: string;
  siteBanners: SiteBanners;
  promoCodes: PromoCodeEntry[];
}
