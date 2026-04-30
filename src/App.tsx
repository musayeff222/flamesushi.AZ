/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Home, 
  Info, 
  Phone, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Clock, 
  ArrowRight,

  Truck,
  Store,
  CreditCard,
  Wallet,
  Tag as TagIcon
} from 'lucide-react';
import type { Product, Category } from './constants.ts';
import type { PromoCodeEntry } from './types/catalog.ts';
import { useCatalog } from './CatalogContext.tsx';

function promoEligible(p: PromoCodeEntry): boolean {
  if (!p.activeOnWebsite) return false;
  const now = Date.now();
  if (p.validFrom) {
    const t = new Date(`${p.validFrom}T00:00:00`).getTime();
    if (Number.isFinite(t) && now < t) return false;
  }
  if (p.validTo) {
    const t = new Date(`${p.validTo}T23:59:59`).getTime();
    if (Number.isFinite(t) && now > t) return false;
  }
  return true;
}

// --- Types ---
type Page = 'home' | 'cart' | 'about' | 'checkout';

interface CartItem extends Product {
  quantity: number;
}

// --- Components ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center text-white text-5xl mb-4 shadow-xl shadow-primary/20">
        🔥
      </div>
      <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Flame Sushi</h1>
      <p className="text-primary font-semibold mt-2">Dadın Ocağı</p>
    </motion.div>
  );
};

const WhatsAppPopup = ({
  onClose,
  whatsappDigits,
}: {
  onClose: () => void;
  whatsappDigits: string;
}) => {
  return (
    <motion.div 
      className="fixed bottom-24 right-6 left-6 z-50 pointer-events-none"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
    >
      <div className="bg-white p-4 rounded-3xl shadow-2xl border border-neutral-100 flex items-center justify-between pointer-events-auto">
        <a 
          href={`https://wa.me/${whatsappDigits}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 flex-1"
        >
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
              alt="WhatsApp" 
              className="w-full h-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-800">Dəstək lazımdır?</h4>
            <p className="text-xs text-neutral-500">Sualınız varsa, birbaşa bizə yazın</p>
          </div>
        </a>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 text-neutral-300 hover:text-neutral-500 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const { catalog } = useCatalog();
  const PRODUCTS = catalog.products;
  const CATEGORIES = catalog.categories;
  const BUSINESS_HOURS = catalog.businessHours;
  const whatsappDigits = catalog.whatsapp.replace(/\D/g, '');

  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('sets');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showWAPopup, setShowWAPopup] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  /** 0 = yoxdur, əks halda endirim faizi (məs. 10) */
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Scroll detection for WhatsApp FAB
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsScrolling(false), 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Checkout states
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  useEffect(() => {
    if (!showSplash) {
      const timer = setTimeout(() => setShowWAPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    setSelectedCategory((prev) =>
      ids.has(prev) ? prev : (CATEGORIES[0]?.id ?? 'sets'),
    );
  }, [CATEGORIES]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.discountPrice || item.price) * item.quantity, 0);
    const m = Math.min(90, Math.max(0, promoDiscountPercent)) / 100;
    return promoDiscountPercent > 0 ? subtotal * (1 - m) : subtotal;
  }, [cart, promoDiscountPercent]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const applyPromo = () => {
    const q = promoCode.trim().toUpperCase();
    const list = catalog.promoCodes ?? [];
    const hit = list.find(
      (p) => p.code.trim().toUpperCase() === q && promoEligible(p),
    );
    if (hit) {
      setPromoDiscountPercent(hit.discountPercent);
    } else {
      alert('Yanlış və ya aktiv olmayan promo kod');
    }
  };

  const [bannerIndex, setBannerIndex] = useState(0);

  const bannerSlides = useMemo(() => {
    const heroUrls =
      catalog.siteBanners?.heroImageUrls?.filter((u) => Boolean(u?.trim())) ?? [];
    const feat = catalog.siteBanners?.featuredProductIds ?? [];
    const pop = PRODUCTS.filter((p) => p.popular);
    const fallback =
      pop.length > 0 ? pop : PRODUCTS.slice(0, Math.min(6, PRODUCTS.length));
    if (heroUrls.length > 0) {
      return heroUrls.map((url, idx) => {
        const pid = feat[idx];
        const product =
          (pid ? PRODUCTS.find((pr) => pr.id === pid) : undefined) ??
          fallback[idx % Math.max(fallback.length, 1)] ??
          PRODUCTS[0];
        const p = product!;
        return { key: `hb-${idx}-${p.id}`, imageUrl: url, product: p };
      });
    }
    return fallback.map((p) => ({ key: p.id, imageUrl: p.image, product: p }));
  }, [catalog.siteBanners, PRODUCTS]);

  const sortedProductsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const cat of CATEGORIES) {
      const arr = PRODUCTS.filter((p) => p.category === cat.id).sort((a, b) => {
        const oa = a.sortOrder ?? 9999;
        const ob = b.sortOrder ?? 9999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, 'az');
      });
      map.set(cat.id, arr);
    }
    return map;
  }, [PRODUCTS, CATEGORIES]);

  const carouselMs = Math.max(2500, (catalog.siteBanners?.carouselSeconds ?? 4) * 1000);

  /** Aşağı sükananda ən çox görünən qrup seçilir; chip sətirini yalnız klikdə mərkəzə sürüşürük. */
  useEffect(() => {
    const sections = CATEGORIES.map((c) =>
      document.getElementById(`menu-${c.id}`),
    ).filter((n): n is HTMLElement => Boolean(n));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio ||
              a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (!hit?.target?.id?.startsWith('menu-')) return;
        const id = hit.target.id.slice('menu-'.length);
        if (CATEGORIES.some((c) => c.id === id))
          setSelectedCategory(id);
      },
      {
        root: null,
        rootMargin: '-12% 0px -52% 0px',
        threshold: [0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5],
      },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [CATEGORIES, PRODUCTS]);

  useEffect(() => {
    if (activePage === 'home') {
      const interval = setInterval(() => {
        const n = bannerSlides.length || 1;
        setBannerIndex((prev) => (prev + 1) % n);
      }, carouselMs);
      return () => clearInterval(interval);
    }
  }, [activePage, bannerSlides.length, carouselMs]);

  const handleOrder = () => {
    if (!customerName || (orderType === 'delivery' && !address)) {
      alert('Zəhmət olmasa bütün məlumatları doldurun');
      return;
    }

    const itemsText = cart.map(item => `${item.name} x${item.quantity} - ${(item.discountPrice || item.price) * item.quantity}₼`).join('%0A');
    const typeText = orderType === 'delivery' ? 'Çatdırılma' : 'Ünvandan götürmə';
    const paymentText = paymentMethod === 'cash' ? 'Nağd' : 'Posterminal (kart)';
    const totalText = `${cartTotal.toFixed(2)}₼`;
    
    const message = `🔥 *YENİ SİFARİŞ - FLAME SUSHI*%0A%0A👤 *Müştəri:* ${customerName}%0A📦 *Növ:* ${typeText}${orderType === 'delivery' ? `%0A📍 *Ünvan:* ${address}` : ''}%0A💳 *Ödəniş:* ${paymentText}%0A%0A🛒 *Məhsullar:*%0A${itemsText}%0A%0A💰 *Cəmi:* ${totalText}${promoDiscountPercent > 0 ? ` (${promoDiscountPercent}% endirim tətbiq edildi)` : ''}`;
    
    window.open(`https://wa.me/${whatsappDigits}?text=${message}`, '_blank');
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  return (
    <div className="app-shell pb-20">
      {/* --- Top Info Bar --- */}
      <div className="bg-info-bg w-full py-1.5 text-center text-[10px] font-bold text-primary border-b border-orange-100 uppercase tracking-widest">
        Hər gün: {BUSINESS_HOURS.open} - {BUSINESS_HOURS.close} • Sürətli Çatdırılma
      </div>

      {/* --- Header --- */}
      <div className="bg-white/80 sticky top-0 z-30 backdrop-blur-md border-b border-neutral-50 shadow-sm shadow-black/5">
        <div className="container-custom py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Flame Sushi</h1>
          <div className="flex items-center gap-6">
            <button 
               onClick={() => setActivePage('about')}
               className={`hidden sm:flex text-sm font-bold transition-colors ${activePage === 'about' ? 'text-primary' : 'text-neutral-500 hover:text-primary'}`}
            >
              Haqqımızda
            </button>
            <div className="bg-orange-100 p-2 rounded-xl text-primary cursor-pointer hover:bg-orange-200 transition-colors">
              <ChevronRight size={20} className="rotate-90 md:rotate-0" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activePage === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 py-8 container-custom"
          >
            {/* --- Banner Carousel --- */}
            <div className="overflow-hidden">
              <motion.div 
                className="flex gap-4"
                animate={{ x: `calc(-${bannerIndex * 100}% - ${bannerIndex * 16}px)` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {bannerSlides.map(({ key, imageUrl, product }) => (
                  <div key={key} className="relative min-w-full md:min-w-[calc(50%-8px)] h-48 md:h-64 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-orange-200/50 overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover brightness-50 transition-transform duration-1000 hover:scale-105" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        <div className="text-[10px] md:text-xs uppercase font-bold opacity-90 mb-2 tracking-wider">Həftənin Təklifi</div>
                        <h3 className="text-2xl md:text-4xl font-bold mb-2 leading-tight drop-shadow-lg">{product.name}</h3>
                        <div className="text-xl md:text-2xl font-bold drop-shadow-md">
                          {product.discountPrice || product.price} ₼ 
                          {product.discountPrice && <span className="text-sm md:text-lg font-normal line-through opacity-60 ml-3">{product.price} ₼</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          addToCart(product);
                          setActivePage('cart');
                        }}
                        className="self-start md:self-end bg-white text-primary text-xs md:text-sm font-bold px-6 py-2.5 md:px-8 md:py-3 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl shadow-black/20"
                      >
                        Sifariş Et
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Kateqoriyalar — basanda həmin qrupa sükan; aşağı sükananda aktiv qrup özü yenilənir */}
            <div className="sticky top-[52px] z-20 -mx-4 bg-white/92 px-4 pb-3 pt-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:top-14">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                Kateqoriyaya keçid
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    id={`chip-${cat.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      requestAnimationFrame(() => {
                        document
                          .getElementById(`chip-${cat.id}`)
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                      });
                      document.getElementById(`menu-${cat.id}`)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }}
                    className={`touch-manipulation whitespace-nowrap rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all ${
                      selectedCategory === cat.id
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                        : 'border-neutral-100 bg-white text-neutral-400 hover:border-primary/30'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Bütün qruplar alt-alta — bir qrupun sonunu gördükcə növbəti qrupun məhsulları görünür */}
            <div className="space-y-14 pb-10">
              {CATEGORIES.map((cat) => {
                const items = sortedProductsByCategory.get(cat.id) ?? [];
                if (items.length === 0) return null;
                return (
                  <section
                    key={cat.id}
                    id={`menu-${cat.id}`}
                    className="scroll-mt-[7.5rem]"
                  >
                    <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-neutral-100 pb-3">
                      <h3 className="text-2xl font-black tracking-tight text-neutral-900">
                        {cat.name}
                      </h3>
                      <span className="text-xs font-bold text-neutral-400">
                        {items.length} məhsul
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((product) => (
                        <div
                          key={product.id}
                          className="group relative flex flex-col space-y-4 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md"
                        >
                          {product.discountPrice ?
                            <div className="absolute right-4 top-4 z-10 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                              -
                              {Math.round(
                                (1 - product.discountPrice / product.price) * 100,
                              )}
                              %
                            </div>
                          : null}
                          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-orange-50">
                            {product.image?.trim() ?
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            : <div className="flex h-full w-full items-center justify-center bg-neutral-100 p-4 text-center text-[11px] font-bold leading-snug text-neutral-400">
                                Şəkil yüklənməyib — admin paneldə seçin
                              </div>
                            }
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-bold leading-tight text-neutral-800">
                              {product.name}
                            </h4>
                            <p className="mt-1 line-clamp-3 text-[11px] text-neutral-400 md:line-clamp-none">
                              {product.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                              {product.discountPrice || product.price} ₼
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/10 transition-all hover:bg-primary-dark active:scale-90"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </motion.div>
        )}

        {activePage === 'cart' && (
          <motion.div 
            key="cart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="py-10 container-custom px-4 pb-24"
          >
            <div className="max-w-[800px] mx-auto space-y-8">
              <div className="flex items-center gap-4 md:gap-5 px-2">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <ShoppingBag size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">Səbətim</h2>
                  <p className="text-xs md:text-sm font-medium text-neutral-400">Cəmi {cartCount} məhsul</p>
                </div>
              </div>
              
              {cart.length === 0 ? (
                <div className="py-24 md:py-32 flex flex-col items-center justify-center space-y-6 md:space-y-8 bg-neutral-50/50 rounded-[40px] md:rounded-[48px] border-2 border-dashed border-neutral-100">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-full flex items-center justify-center shadow-xl shadow-black/5 animate-bounce">
                    <ShoppingBag size={40} className="text-neutral-200 md:w-14 md:h-14" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-bold text-xl md:text-2xl text-neutral-400 uppercase tracking-tighter">Səbətiniz boşdur</p>
                    <button 
                      onClick={() => setActivePage('home')}
                      className="bg-primary text-white px-8 py-3 rounded-xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
                    >
                      Menyuya Qayıt
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:gap-6">
                    {cart.map(item => (
                      <div key={item.id} className="group flex items-center gap-4 md:gap-6 bg-white border border-neutral-100 p-4 md:p-5 rounded-[28px] md:rounded-[32px] shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="relative overflow-hidden rounded-xl md:rounded-2xl w-20 h-20 md:w-28 md:h-28 shrink-0 shadow-lg shadow-black/5">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 space-y-2 md:space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-base md:text-xl text-neutral-800 tracking-tight leading-tight">{item.name}</h4>
                            <button 
                              onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} 
                              className="p-1.5 md:p-2 text-neutral-200 hover:text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"
                            >
                              <X size={16} className="md:w-5 md:h-5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-primary font-black text-lg md:text-xl">{(item.discountPrice || item.price)} ₼</p>
                            <div className="flex items-center gap-1.5 md:gap-2 bg-neutral-100/50 p-1 rounded-xl md:rounded-2xl">
                              <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-[10px] md:rounded-[14px] flex items-center justify-center text-neutral-500 hover:text-primary shadow-sm active:scale-90 transition-all"><Minus size={14} className="md:w-[18px] md:h-[18px]" /></button>
                              <span className="font-black text-base md:text-lg min-w-[24px] md:min-w-[32px] text-center text-neutral-700">{item.quantity}</span>
                              <button onClick={() => addToCart(item)} className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-[10px] md:rounded-[14px] flex items-center justify-center text-primary shadow-sm active:scale-90 transition-all"><Plus size={14} className="md:w-[18px] md:h-[18px]" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-primary text-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] space-y-6 md:space-y-8 shadow-2xl shadow-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between text-white/60 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                        <span>Məbləğ</span>
                        <span className="text-base md:text-lg">
                          {(cartTotal / (promoDiscountPercent > 0 ? (1 - Math.min(90, promoDiscountPercent) / 100) : 1)).toFixed(2)}{' '}
                          ₼
                        </span>
                      </div>
                      <div className="flex gap-2 md:gap-3">
                        <input 
                          type="text" 
                          placeholder="Promo kod"
                          className="flex-1 bg-white/10 border border-white/20 rounded-[18px] md:rounded-[24px] px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold focus:ring-2 focus:ring-white/40 outline-none transition-all placeholder:text-white/40"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          disabled={promoDiscountPercent > 0}
                        />
                        <button 
                          onClick={applyPromo}
                          className={`px-5 md:px-8 py-3 md:py-4 rounded-[18px] md:rounded-[24px] font-black transition-all uppercase tracking-widest text-[10px] md:text-xs ${promoDiscountPercent > 0 ? 'bg-white text-primary' : 'bg-neutral-900 text-white hover:bg-black shadow-2xl shadow-black/20'}`}
                          disabled={promoDiscountPercent > 0}
                        >
                          {promoDiscountPercent > 0 ? 'Ok' : 'Yoxla'}
                        </button>
                      </div>
                      {promoDiscountPercent > 0 && (
                        <div className="flex items-center justify-between text-white font-extrabold py-1">
                          <span className="flex items-center gap-2 text-sm md:text-base">
                            <TagIcon size={16} /> ENDİRİM ({promoDiscountPercent}%)
                          </span>
                          <span className="text-lg md:text-xl">
                            -
                            {(
                              (cartTotal /
                                (1 - Math.min(90, promoDiscountPercent) / 100)) *
                              (Math.min(90, promoDiscountPercent) / 100)
                            ).toFixed(2)}{' '}
                            ₼
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-white/10 my-2 md:my-4" />
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 font-bold text-lg md:text-xl uppercase tracking-tighter">Cəmi Məbləğ</span>
                        <span className="text-3xl md:text-5xl font-black text-white tracking-tighter">{cartTotal.toFixed(2)} ₼</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActivePage('checkout')}
                      className="w-full relative z-10 bg-white text-primary font-black py-5 md:py-6 rounded-[20px] md:rounded-[28px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl uppercase tracking-widest group"
                    >
                      Sifarişi Tamamla
                      <ArrowRight size={24} className="md:w-7 md:h-7 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {activePage === 'checkout' && (
          <motion.div 
            key="checkout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-10 container-custom px-4 pb-20"
          >
            <div className="max-w-xl mx-auto space-y-8">
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActivePage('cart')} 
                    className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all active:scale-90"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-xl md:text-2xl font-black text-neutral-800 tracking-tight uppercase">Tamamlama</h2>
              </div>

              <div className="space-y-8">
                {/* Type Switch */}
                <div className="bg-neutral-100 p-1.5 rounded-3xl flex">
                  <button 
                    onClick={() => setOrderType('delivery')}
                    className={`flex-1 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all ${orderType === 'delivery' ? 'bg-white shadow-md text-primary' : 'text-neutral-400 hover:text-neutral-500'}`}
                  >
                    <Truck size={22} />
                    Çatdırılma
                  </button>
                  <button 
                    onClick={() => setOrderType('pickup')}
                    className={`flex-1 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all ${orderType === 'pickup' ? 'bg-white shadow-md text-primary' : 'text-neutral-400 hover:text-neutral-500'}`}
                  >
                    <Store size={22} />
                    Götürmə
                  </button>
                </div>

                <div className="grid gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">Adınız və Soyadınız</label>
                    <input 
                      type="text" 
                      placeholder="Nümunə: Əli Məmmədov"
                      className="w-full bg-white border-2 border-neutral-50 rounded-3xl px-6 py-4.5 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/20 outline-none transition-all shadow-sm"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  {orderType === 'delivery' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">Çatdırılma Ünvanı</label>
                      <textarea 
                        placeholder="Küçə, Bina girişi, Mənzil nömrəsi..."
                        className="w-full bg-white border-2 border-neutral-50 rounded-[32px] px-6 py-5 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/20 outline-none transition-all shadow-sm min-h-[120px]"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">Ödəniş Üsulu</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-6 rounded-3xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-50 bg-white opacity-60 hover:opacity-100 hover:border-neutral-100'}`}
                      >
                        <div className={`p-3 rounded-xl ${paymentMethod === 'cash' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                          <Wallet size={24} />
                        </div>
                        <span className="text-lg font-bold">Nağd Ödəniş</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('card')}
                        className={`p-6 rounded-3xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-50 bg-white opacity-60 hover:opacity-100 hover:border-neutral-100'}`}
                      >
                        <div className={`p-3 rounded-xl ${paymentMethod === 'card' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                          <CreditCard size={24} />
                        </div>
                        <span className="text-lg font-bold">Götürərkən Kartla</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-12 bg-primary text-white rounded-[32px] md:rounded-[48px] space-y-6 md:space-y-8 shadow-2xl shadow-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl opacity-40" />
                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-white/20 pb-4">
                       <span className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Ödəniləcək Məbləğ</span>
                       <div className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none">{cartTotal.toFixed(2)} ₼</div>
                    </div>
                    <button 
                      onClick={handleOrder}
                      className="w-full bg-white text-primary font-black py-4 md:py-6 rounded-[22px] md:rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-black/10 hover:bg-neutral-50 text-base md:text-xl uppercase tracking-widest group"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-6 h-6 md:w-8 md:h-8" />
                        <span>Sifarişi Təsdiqlə</span>
                      </div>
                      <ArrowRight size={20} className="md:w-24 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activePage === 'about' && (
           <motion.div 
            key="other"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 container-custom space-y-12"
           >
              <div className="max-w-4xl mx-auto space-y-12 px-4">
                <div className="space-y-6 text-center">
                  <h2 className="text-5xl md:text-7xl font-black leading-tight text-neutral-900 tracking-tighter">Dadlı Sushi-nin Unikal Ünvanı</h2>
                  <div className="w-32 h-2 bg-primary rounded-full mx-auto shadow-2xl shadow-primary/40" />
                  <p className="text-xl md:text-2xl text-neutral-500 leading-relaxed font-semibold max-w-3xl mx-auto">
                    Flame Sushi olaraq biz sizə ən təzə dəniz məhsulları və unikal dadlar təqdim edirik. Hər bir sushi peşəkar aşpazlarımız tərəfindən sevgi ilə hazırlanır.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[40px] space-y-6 border border-neutral-100 shadow-sm text-center hover:shadow-xl transition-all duration-300">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-primary shadow-inner mx-auto"><Truck size={40} /></div>
                    <div className="space-y-2">
                        <h4 className="font-extrabold text-2xl text-neutral-800">Sürətli Çatdırılma</h4>
                        <p className="text-sm text-neutral-400 font-medium">Şəhər daxili seçilmiş ünvanlara 45 dəqiqə ərzində çatdırırıq</p>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] space-y-6 border border-neutral-100 shadow-sm text-center hover:shadow-xl transition-all duration-300">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-primary shadow-inner mx-auto"><Store size={40} /></div>
                    <div className="space-y-2">
                        <h4 className="font-extrabold text-2xl text-neutral-800">Peşəkar Xidmət</h4>
                        <p className="text-sm text-neutral-400 font-medium">Hər bir sifarişə xüsusi diqqət və yüksək səviyyəli servis</p>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] space-y-6 border border-neutral-100 shadow-sm text-center hover:shadow-xl transition-all duration-300">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-primary shadow-inner mx-auto"><ShoppingBag size={40} /></div>
                    <div className="space-y-2">
                        <h4 className="font-extrabold text-2xl text-neutral-800">Təzə Məhsullar</h4>
                        <p className="text-sm text-neutral-400 font-medium">Sizin üçün hər gün ən təzə və keyfiyyətli dəniz məhsulları</p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary text-white p-8 md:p-20 rounded-[48px] md:rounded-[64px] space-y-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 shadow-2xl shadow-primary/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-white/20 transition-all duration-700" />
                    <div className="space-y-6 md:space-y-8 relative z-10">
                      <h3 className="font-black text-3xl md:text-6xl leading-tight tracking-tighter">Sualınız var? <br className="hidden md:block"/> Bizimlə paylaşın</h3>
                      <div className="flex flex-col gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-6 text-lg md:text-2xl">
                          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Phone size={20} className="md:w-7 md:h-7" /></div>
                          <span className="font-black">+994 55 533 88 98</span>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 text-lg md:text-2xl">
                          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Clock size={20} className="md:w-7 md:h-7" /></div>
                          <span className="font-black">Hər gün: 11:00 - 23:00</span>
                        </div>
                      </div>
                    </div>
                    <a 
                      href={`https://wa.me/${whatsappDigits}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between lg:justify-start gap-4 md:gap-8 bg-white px-6 md:px-12 py-6 md:py-8 rounded-[28px] md:rounded-[36px] group transition-all shadow-2xl shadow-black/10 hover:scale-105 active:scale-95 relative z-10 w-full lg:w-auto"
                    >
                      <div className="flex items-center gap-4 md:gap-5">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
                          alt="WhatsApp" 
                          className="w-10 h-10 md:w-12 md:h-12"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-0.5 md:space-y-1">
                          <span className="block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-primary/60 text-left">Birbaşa Əlaqə</span>
                          <span className="text-xl md:text-2xl font-black text-neutral-900 leading-none">Vatsap Yaz</span>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-3 md:p-4 rounded-xl md:rounded-2xl group-hover:translate-x-2 transition-transform text-primary">
                        <ArrowRight size={24} className="md:w-8 md:h-8" />
                      </div>
                    </a>
                </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- Floating Bottom Nav --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-neutral-100">
        <div className="container-custom py-4 flex justify-around sm:justify-center sm:gap-24 items-center">
          <button 
            onClick={() => setActivePage('home')}
            className={`flex flex-col items-center transition-all ${activePage === 'home' ? 'text-primary scale-110' : 'text-neutral-300 hover:text-neutral-400'}`}
          >
            <Home size={26} fill={activePage === 'home' ? 'currentColor' : 'none'} className="transition-transform active:scale-90" />
            <span className="text-[10px] sm:text-xs mt-1 font-black uppercase tracking-tighter">Menyu</span>
          </button>
          <button 
            onClick={() => setActivePage('cart')}
            className={`flex flex-col items-center transition-all relative ${activePage === 'cart' ? 'text-primary scale-110' : 'text-neutral-300 hover:text-neutral-400'}`}
          >
            <div className="relative">
              <ShoppingBag size={26} fill={activePage === 'cart' ? 'currentColor' : 'none'} className="transition-transform active:scale-90" />
              {cartCount > 0 && (
                <div className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-black">
                  {cartCount}
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-xs mt-1 font-black uppercase tracking-tighter">Səbət</span>
          </button>
          <button 
            onClick={() => setActivePage('about')}
            className={`flex flex-col items-center transition-all ${activePage === 'about' ? 'text-primary scale-110' : 'text-neutral-300 hover:text-neutral-400'}`}
          >
            <Info size={26} fill={activePage === 'about' ? 'currentColor' : 'none'} className="transition-transform active:scale-90" />
            <span className="text-[10px] sm:text-xs mt-1 font-black uppercase tracking-tighter">Haqqımızda</span>
          </button>
        </div>
      </div>

      {/* --- Popups & FABs --- */}
      <AnimatePresence>
        {showWAPopup && activePage === 'home' && (
          <WhatsAppPopup
            whatsappDigits={whatsappDigits}
            onClose={() => setShowWAPopup(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isScrolling && activePage !== 'checkout' && (
          <motion.a 
            key="wa-fab"
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 45 }}
            href={`https://wa.me/${whatsappDigits}`}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-28 right-6 sm:right-10 z-40 w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-[0_20px_50px_rgba(34,197,94,0.3)] hover:scale-110 active:scale-95 transition-all border-4 border-green-500 p-2.5 group"
          >
            <div className="absolute inset-0 bg-green-500/10 rounded-[20px] scale-110 animate-pulse group-hover:hidden" />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
              alt="WhatsApp" 
              className="w-full h-full relative z-10"
              referrerPolicy="no-referrer"
            />
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
