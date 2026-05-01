export type DiscountDisplayMode = 'none' | 'percent' | 'fixed';

/** Sifariş vaxt pəncərəsi (əsas məhsullar üçün) */
export interface ProductOrderWindow {
  enabled?: boolean;
  /** "HH:mm" */
  start?: string;
  /** "HH:mm" — ümumi bitişdə 00:00 günün sonu kimi yozula bilər */
  end?: string;
  /** true: vaxt kənarında bölmədə göstərilmir; false: deaktiv + mesaj */
  hideOutsideWindow?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  popular?: boolean;
  sortOrder?: number;
  /** Vizual badge üçün endirim faizi (%), məsələn 15 */
  discountPercent?: number;
  /** Sabit məbləğ təklifi üçün (discountMode === fixed) — ₼ */
  discountFixedAmount?: number;
  discountMode?: DiscountDisplayMode;
  availabilityNote?: string;
  /** Menyuda əlavə kiçik qeyd (təsvirdən ayrı) */
  extraNote?: string;
  orderWindow?: ProductOrderWindow;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface HeroBannerSlide {
  id: string;
  name: string;
  imageUrl: string;
  overlayProductName: string;
  overlayPriceLabel: string;
  durationSeconds: number;
}

/** Ana karusel — slides üstün tutulur; köhnə URL massivlər normalizdə sinxron saxlanılır */
export interface SiteBanners {
  slides: HeroBannerSlide[];
  carouselSeconds?: number;
  heroImageUrls?: string[];
  featuredProductIds?: string[];
}

export interface PromoDiscount {
  discountType?: 'percent' | 'fixed';
  /** percent zamanı faiz (1–90) */
  discountPercent?: number;
  /** fixed zamanı səbət cəmisindən çıxılacaq ₼ (yuxarıya yuvarlatılmış) */
  discountFixedAmount?: number;
}

export interface PromoCodeEntry extends PromoDiscount {
  id: string;
  code: string;
  activeOnWebsite: boolean;
  validFrom?: string;
  validTo?: string;
  note?: string;
  createdAt: string;
}

export type ThemeId = 'flame' | 'sakura' | 'ocean';

export interface SiteSettings {
  themeId?: ThemeId;
  /** Haqqımızda — çoxsətirli düz mətn */
  aboutText?: string;
  /** Göstəriş üçün əlaqə telefon */
  contactPhone?: string;
}

export interface CatalogState {
  categories: Category[];
  products: Product[];
  businessHours: { open: string; close: string };
  whatsapp: string;
  siteBanners: SiteBanners;
  promoCodes: PromoCodeEntry[];
  siteSettings?: SiteSettings;
}
