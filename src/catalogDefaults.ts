/**
 * Canonical menu + site copy for Flame Sushi. Admin panel edits persist in data/catalog.json on the server.
 */
import type { CatalogState, PromoCodeEntry } from './types/catalog';

export const defaultCatalogState: CatalogState = {
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
      description: 'Xırtıldayan krevet və ərinmiş pendir ilə isti roll',
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
      description: 'Sərinləşdirici buz kimi içki',
      price: 2,
      category: 'drinks',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'd2',
      name: 'Fanta 0.5L',
      description: 'Meyvəli sərinləşdirici içki',
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
    heroImageUrls: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&q=80&w=1200',
    ],
    featuredProductIds: ['1', 's2'],
    carouselSeconds: 4,
  },
  promoCodes: [
    {
      id: 'promo-flame10',
      code: 'FLAME10',
      discountPercent: 10,
      activeOnWebsite: true,
      createdAt: new Date().toISOString().slice(0, 10),
    },
  ],
};

function isIsoDateLike(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
}

/** Köhnə catalog.json-larda yeni sahələr yoxdursa doldurulur */
export function normalizeCatalogState(raw: unknown): CatalogState {
  const d = defaultCatalogState;
  if (!raw || typeof raw !== 'object') return { ...d, products: [...d.products], categories: [...d.categories] };

  const o = raw as Partial<CatalogState>;
  const merged: CatalogState = {
    categories: Array.isArray(o.categories) ? o.categories : d.categories,
    products: Array.isArray(o.products) ? o.products : d.products,
    businessHours:
      o.businessHours &&
      typeof o.businessHours.open === 'string' &&
      typeof o.businessHours.close === 'string'
        ? { open: o.businessHours.open, close: o.businessHours.close }
        : d.businessHours,
    whatsapp: typeof o.whatsapp === 'string' ? o.whatsapp : d.whatsapp,
    siteBanners: (() => {
      const sb = o.siteBanners;
      const base = d.siteBanners;
      if (!sb || typeof sb !== 'object') return { ...base };
      const urls = sb.heroImageUrls;
      const ids = sb.featuredProductIds;
      return {
        heroImageUrls:
          Array.isArray(urls) && urls.every((u) => typeof u === 'string')
            ? urls
            : base.heroImageUrls,
        featuredProductIds:
          Array.isArray(ids) && ids.every((x) => typeof x === 'string')
            ? ids
            : base.featuredProductIds,
        carouselSeconds:
          typeof sb.carouselSeconds === 'number' && sb.carouselSeconds >= 2
            ? sb.carouselSeconds
            : base.carouselSeconds,
      };
    })(),
    promoCodes: (() => {
      if (!Array.isArray(o.promoCodes)) return d.promoCodes;
      const out: PromoCodeEntry[] = [];
      for (const p of o.promoCodes) {
        if (
          !p ||
          typeof p !== 'object' ||
          typeof (p as PromoCodeEntry).id !== 'string' ||
          typeof (p as PromoCodeEntry).code !== 'string' ||
          typeof (p as PromoCodeEntry).discountPercent !== 'number' ||
          typeof (p as PromoCodeEntry).activeOnWebsite !== 'boolean' ||
          typeof (p as PromoCodeEntry).createdAt !== 'string'
        )
          continue;
        const pc = p as PromoCodeEntry;
        out.push({
          id: pc.id,
          code: pc.code,
          discountPercent: Math.min(95, Math.max(1, Math.round(pc.discountPercent))),
          activeOnWebsite: pc.activeOnWebsite,
          validFrom: isIsoDateLike(pc.validFrom) ? pc.validFrom : undefined,
          validTo: isIsoDateLike(pc.validTo) ? pc.validTo : undefined,
          note: typeof pc.note === 'string' ? pc.note : undefined,
          createdAt: pc.createdAt,
        });
      }
      return out.length ? out : d.promoCodes;
    })(),
  };
  return merged;
}
