/**
 * Canonical menu + serverdə data/catalog.json üzərindən persist olunur.
 */
import type {
  CatalogState,
  HeroBannerSlide,
  Product,
  PromoCodeEntry,
  SiteBanners,
  SiteSettings,
} from './types/catalog';

export const defaultCatalogState: CatalogState = {
  siteSettings: {
    themeId: 'flame',
    aboutText:
      'Flame Sushi — təzə materiallar, sürətli çatdırılma və alovlu dadlar təqdim edir.',
    contactPhone: '',
  },
  categories: [
    { id: 'sets', name: 'Setlər', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=200' },
    { id: 'rolls', name: 'Roll-lar', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=200' },
    { id: 'hot-rolls', name: 'İsti Roll-lar', image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d?auto=format&fit=crop&q=80&w=200' },
    { id: 'nigiri', name: 'Nigiri', image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=200' },
    { id: 'drinks', name: 'İçkilər', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=200' },
  ],
  products: [
    {
      id: '1',
      name: 'Flame Set',
      description: '32 ədəd qarışıq rollar: Filadelfiya, Kaliforniya, Hot Roll',
      price: 45,
      discountPrice: 39,
      category: 'sets',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=600',
      popular: true,
      discountMode: 'percent',
      discountPercent: 13,
    },
    {
      id: 's2',
      name: 'Mega Family Set',
      description: '48 ədəd: Müxtəlif növ rollar, nigirilər və isti rollar',
      price: 65,
      discountPrice: 58,
      category: 'sets',
      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=600',
      popular: true,
    },
    {
      id: 's3',
      name: 'Midnight Set',
      description: '24 ədəd: Gecə sevənlər üçün özəl souslu rollar',
      price: 35,
      category: 'sets',
      image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 's4',
      name: 'Business Set',
      description: '16 ədəd: İş arası nahar üçün ideal seçim',
      price: 22,
      category: 'sets',
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '2',
      name: 'Ekonom Set',
      description: '24 ədəd: Sadə rollar və maki sevdalıları üçün',
      price: 25,
      category: 'sets',
      image: 'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '3',
      name: 'Filadelfiya Classic',
      description: 'Təzə qızıl balıq, krem pendir, xiyar',
      price: 12,
      category: 'rolls',
      image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d?auto=format&fit=crop&q=80&w=600',
      popular: true,
    },
    {
      id: 'r3',
      name: 'Qızıl Dragon Roll',
      description: 'Közdə bişmiş ilan balığı, kürü və özəl sous',
      price: 16,
      category: 'rolls',
      image: 'https://images.unsplash.com/photo-1590048632661-4954f92bc39f?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '4',
      name: 'Kaliforniya',
      description: 'Yengəc, kürü, mayonez, xiyar',
      price: 10,
      category: 'rolls',
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '5',
      name: 'Hot Salmon Roll',
      description: 'İsti bişmiş qızıl balıq, xırtıldayan tempura',
      price: 14,
      discountPrice: 12,
      category: 'hot-rolls',
      image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&q=80&w=600',
      popular: true,
    },
    {
      id: 'h2',
      name: 'Hot Ebi Tempura',
      description: 'Xırtıldayan krevet və irinmiş pendir ilə isti roll',
      price: 15,
      category: 'hot-rolls',
      image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '6',
      name: 'Sake Nigiri',
      description: 'Təzə qızıl balıq hissəsi ilə nigiri',
      price: 3,
      category: 'nigiri',
      image: 'https://images.unsplash.com/photo-1534482421-0259b3be4888?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '7',
      name: 'Ebi Nigiri',
      description: 'Pörtlədilmiş krevet ilə nigiri',
      price: 4,
      category: 'nigiri',
      image: 'https://images.unsplash.com/photo-1625938146369-adc83368bca7?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: '8',
      name: 'Coca-Cola 0.5L',
      description: 'Sərinləşdirici içki',
      price: 2,
      category: 'drinks',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'd2',
      name: 'Fanta 0.5L',
      description: 'Meyvəli içki',
      price: 2,
      category: 'drinks',
      image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&q=80&w=600',
    },
  ],
  businessHours: {
    open: '11:00',
    close: '23:00',
  },
  whatsapp: '0555338898',
  siteBanners: {
    carouselSeconds: 4,
    slides: [
      {
        id: 'slide-default-a',
        name: 'Flame təklifi',
        imageUrl:
          'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1200',
        overlayProductName: 'Flame Set',
        overlayPriceLabel: '39 ₼',
        durationSeconds: 4,
      },
      {
        id: 'slide-default-b',
        name: 'Ailə menyusu',
        imageUrl:
          'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&q=80&w=1200',
        overlayProductName: 'Mega Family Set',
        overlayPriceLabel: '58 ₼',
        durationSeconds: 4,
      },
    ],
  },
  promoCodes: [
    {
      id: 'promo-flame10',
      code: 'FLAME10',
      discountType: 'percent',
      discountPercent: 10,
      activeOnWebsite: true,
      createdAt: new Date().toISOString().slice(0, 10),
    },
  ],
};

function isIsoDateLike(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
}

function safeId(prefix: string): string {
  const uuid = typeof globalThis !== 'undefined'
    ? globalThis.crypto?.randomUUID?.()
    : undefined;
  return uuid ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampPercent(n: number): number {
  return Math.min(95, Math.max(1, Math.round(Number.isFinite(n) ? n : 0)));
}

function pickFallbackProduct(products: Product[], index: number): Product {
  const pop = products.filter((p) => p.popular);
  const pool = pop.length ? pop : products;
  const p = pool[index % Math.max(pool.length, 1)]!;
  return p;
}

function buildSlidesLegacy(
  heroImageUrls: string[],
  featuredProductIds: string[],
  products: Product[],
  carouselSeconds: number,
): HeroBannerSlide[] {
  return heroImageUrls.map((imageUrl, i) => {
    const pid = featuredProductIds[i];
    const prod =
      (pid ? products.find((p) => p.id === pid) : undefined)
      ?? pickFallbackProduct(products, i)
      ?? {
        id: 'x',
        name: '',
        description: '',
        price: 0,
        category: '',
        image: '',
      };
    const line = prod.discountPrice ?? prod.price;
    return {
      id: safeId(`hb-${i}`),
      name: `Baner ${i + 1}`,
      imageUrl,
      overlayProductName: prod.name,
      overlayPriceLabel: `${Number(line).toFixed(0)} ₼`,
      durationSeconds: Math.min(120, Math.max(2, carouselSeconds)),
    };
  });
}

function normalizeBannerSlide(
  raw: unknown,
  index: number,
  fallbackDuration: number,
): HeroBannerSlide {
  const dur = Math.min(
    360,
    Math.max(2, Math.round(Number.isFinite(fallbackDuration) ? fallbackDuration : 4)),
  );
  if (!raw || typeof raw !== 'object')
    return {
      id: safeId(`hb-f-${index}`),
      name: `Baner ${index + 1}`,
      imageUrl: '',
      overlayProductName: '',
      overlayPriceLabel: '',
      durationSeconds: dur,
    };
  const o = raw as Partial<HeroBannerSlide>;
  return {
    id: typeof o.id === 'string' && o.id ? o.id : safeId(`hb-${index}`),
    name:
      typeof o.name === 'string' && o.name.trim()
        ? o.name.trim()
        : `Baner ${index + 1}`,
    imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : '',
    overlayProductName:
      typeof o.overlayProductName === 'string'
        ? o.overlayProductName
        : '',
    overlayPriceLabel:
      typeof o.overlayPriceLabel === 'string'
        ? o.overlayPriceLabel
        : `${0} ₼`,
    durationSeconds:
      typeof o.durationSeconds === 'number' &&
      Number.isFinite(o.durationSeconds) &&
      o.durationSeconds >= 2
        ? Math.min(360, Math.round(o.durationSeconds))
        : dur,
  };
}

function normalizeSiteBanners(
  raw: unknown,
  products: Product[],
  base: SiteBanners,
): SiteBanners {
  const sb =
    raw && typeof raw === 'object'
      ? (raw as Partial<SiteBanners> & Record<string, unknown>)
      : undefined;
  const carouselSeconds =
    sb &&
    typeof sb.carouselSeconds === 'number' &&
    sb.carouselSeconds >= 2
      ? Math.min(240, sb.carouselSeconds)
      : base.carouselSeconds ?? 4;

  let slidesRaw: HeroBannerSlide[] | null = null;
  if (sb?.slides !== undefined && Array.isArray(sb.slides) && sb.slides.length > 0) {
    slidesRaw = (sb.slides as unknown[]).map((s, i) =>
      normalizeBannerSlide(s, i, carouselSeconds ?? 4),
    );
  }

  let slides =
    slidesRaw && slidesRaw.length > 0
      ? slidesRaw
      : (() => {
          const urls = Array.isArray(sb?.heroImageUrls)
            ? (sb.heroImageUrls as unknown[]).filter(
                (u): u is string => typeof u === 'string' && Boolean(u.trim()),
              )
            : [];
          const feats =
            Array.isArray(sb?.featuredProductIds)
              ? (sb.featuredProductIds as unknown[]).filter(
                  (x): x is string => typeof x === 'string',
                )
              : [];
          if (urls.length > 0) {
            return buildSlidesLegacy(urls, feats, products, carouselSeconds ?? 4);
          }
          return base.slides;
        })();

  if (!slides.length) slides = base.slides;

  return {
    carouselSeconds,
    slides,
    heroImageUrls: slides.map((s) => s.imageUrl),
    featuredProductIds: slides.map(() => ''),
  };
}

function normalizeSiteSettings(raw: unknown, base: SiteSettings): SiteSettings {
  if (!raw || typeof raw !== 'object')
    return { ...base };
  const o = raw as Partial<SiteSettings>;
  return {
    themeId:
      o.themeId === 'sakura' || o.themeId === 'ocean' || o.themeId === 'flame'
        ? o.themeId
        : base.themeId ?? 'flame',
    aboutText:
      typeof o.aboutText === 'string' ? o.aboutText : base.aboutText ?? '',
    contactPhone:
      typeof o.contactPhone === 'string'
        ? o.contactPhone.trim()
        : base.contactPhone ?? '',
  };
}

/** Köhnə kataloq strukturunu yeni sahələrlə uyğunlaşdırır */
export function normalizeCatalogState(raw: unknown): CatalogState {
  const d = defaultCatalogState;
  if (!raw || typeof raw !== 'object')
    return JSON.parse(JSON.stringify(d)) as CatalogState;

  const o = raw as Partial<CatalogState>;
  const products = Array.isArray(o.products)
    ? (o.products as Product[])
    : d.products;

  const siteBanners = normalizeSiteBanners(o.siteBanners, products, d.siteBanners);

  const siteSettingsDefaults: SiteSettings = {
    themeId: d.siteSettings?.themeId ?? 'flame',
    aboutText: d.siteSettings?.aboutText ?? '',
    contactPhone: d.siteSettings?.contactPhone ?? '',
  };
  const siteSettings = normalizeSiteSettings(
    typeof o.siteSettings === 'object' && o.siteSettings !== null ?
      (o.siteSettings as SiteSettings)
    : {},
    siteSettingsDefaults,
  );

  const promoCodes: PromoCodeEntry[] = (() => {
    if (!Array.isArray(o.promoCodes)) return d.promoCodes;
    const out: PromoCodeEntry[] = [];
    for (const p of o.promoCodes) {
      if (
        !p ||
        typeof p !== 'object' ||
        typeof (p as PromoCodeEntry).id !== 'string' ||
        typeof (p as PromoCodeEntry).code !== 'string' ||
        typeof (p as PromoCodeEntry).activeOnWebsite !== 'boolean' ||
        typeof (p as PromoCodeEntry).createdAt !== 'string'
      )
        continue;
      const pc = p as PromoCodeEntry;
      const pctRaw =
        typeof pc.discountPercent === 'number' && Number.isFinite(pc.discountPercent)
          ? pc.discountPercent
          : NaN;

      let fixedAmt =
        typeof pc.discountFixedAmount === 'number' &&
        Number.isFinite(pc.discountFixedAmount) &&
        pc.discountFixedAmount > 0
          ? Math.min(999999, pc.discountFixedAmount)
          : undefined;

      const wantFixed =
        pc.discountType === 'fixed'
        || (fixedAmt !== undefined && fixedAmt > 0 && pc.discountType !== 'percent');

      if (wantFixed && !fixedAmt && Number.isFinite(pctRaw))
        fixedAmt = Math.max(0.01, pctRaw);

      const dtype: PromoCodeEntry['discountType'] =
        wantFixed || fixedAmt ? 'fixed' : 'percent';

      let discountPercentFinal: number | undefined =
        dtype === 'percent'
          ? clampPercent(Number.isFinite(pctRaw) ? pctRaw : 10)
          : undefined;

      let discountFixedFinal: number | undefined =
        dtype === 'fixed' ?
          fixedAmt ?? Math.max(0.01, Number.isFinite(pctRaw) ? pctRaw : 1)
        : undefined;

      if (dtype === 'percent' && !discountPercentFinal) discountPercentFinal = 10;
      if (dtype === 'fixed' && discountFixedFinal === undefined)
        discountFixedFinal = 1;

      out.push({
        id: pc.id,
        code: String(pc.code).trim(),
        activeOnWebsite: pc.activeOnWebsite,
        discountType: dtype,
        discountPercent: discountPercentFinal,
        discountFixedAmount: discountFixedFinal,
        validFrom: isIsoDateLike(pc.validFrom) ? pc.validFrom : undefined,
        validTo: isIsoDateLike(pc.validTo) ? pc.validTo : undefined,
        note: typeof pc.note === 'string' ? pc.note : undefined,
        createdAt: pc.createdAt,
      });
    }
    return out.length ? out : d.promoCodes;
  })();

  return {
    siteSettings,
    categories: Array.isArray(o.categories) ? o.categories : d.categories,
    products,
    businessHours:
      o.businessHours &&
      typeof o.businessHours.open === 'string' &&
      typeof o.businessHours.close === 'string'
        ? { open: o.businessHours.open, close: o.businessHours.close }
        : d.businessHours,
    whatsapp:
      typeof o.whatsapp === 'string' ? o.whatsapp.replace(/\D/g, '') : d.whatsapp,
    siteBanners,
    promoCodes,
  };
}
