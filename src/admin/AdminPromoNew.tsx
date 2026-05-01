import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type {
  CatalogState,
  PromoCodeEntry,
  PromoDiscount,
} from '../types/catalog.ts';
import { useCatalog } from '../CatalogContext.tsx';
import {
  cloneCatalogJson,
  useDebouncedAdminCatalogPersist,
} from './catalogPersist.tsx';
import { ADMIN_ROUTES } from './paths.ts';

function isoDateToday() {
  return new Date().toISOString().slice(0, 10);
}

function randomPromoCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

async function fetchAdminMe(): Promise<{
  authenticated: boolean;
}> {
  const r = await fetch('/api/admin/me', { credentials: 'include' });
  const j = (await r.json()) as { authenticated?: boolean };
  return { authenticated: Boolean(j.authenticated) };
}

export default function AdminPromoNew() {
  const navigate = useNavigate();
  const { catalog, status } = useCatalog();

  const initRef = useRef(false);
  const newPromoIdRef = useRef<string>('');

  const [authOk, setAuthOk] = useState(false);
  const [draft, setDraft] = useState<CatalogState>(() =>
    cloneCatalogJson(catalog),
  );

  useDebouncedAdminCatalogPersist(draft, catalog);

  useEffect(() => {
    void (async () => {
      const auth = await fetchAdminMe();
      if (!auth.authenticated) {
        navigate(ADMIN_ROUTES.login, { replace: true });
        return;
      }
      setAuthOk(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!authOk || status !== 'ready' || initRef.current) return;
    initRef.current = true;

    const id =
      globalThis.crypto?.randomUUID?.() ??
      `promo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const entry: PromoCodeEntry = {
      id,
      code: randomPromoCode(),
      discountType: 'percent',
      discountPercent: 10,
      activeOnWebsite: true,
      createdAt: isoDateToday(),
    };

    newPromoIdRef.current = id;
    const next = cloneCatalogJson(catalog);
    next.promoCodes = [...(next.promoCodes ?? []), entry];
    setDraft(next);
  }, [authOk, status, catalog]);

  const promo = draft.promoCodes?.find(
    (x) => x.id === newPromoIdRef.current,
  );

  function cancelBack() {
    navigate(`${ADMIN_ROUTES.panel}?tab=promos`, { replace: true });
  }

  function updatePromo(patch: Partial<PromoCodeEntry>) {
    if (!promo) return;
    setDraft((d) => ({
      ...d,
      promoCodes: (d.promoCodes ?? []).map((p) =>
        p.id === promo.id ? { ...p, ...patch } : p,
      ),
    }));
  }

  function promoDiscountDraft(): PromoDiscount {
    const t = promo?.discountType === 'fixed' ? 'fixed' : 'percent';
    return {
      discountType: t,
      discountPercent: promo?.discountPercent,
      discountFixedAmount: promo?.discountFixedAmount,
    };
  }

  function setDiscountType(kind: 'percent' | 'fixed') {
    if (!promo) return;
    if (kind === 'percent')
      updatePromo({
        discountType: 'percent',
        discountPercent: Math.min(90, promo.discountPercent ?? 10),
        discountFixedAmount: undefined,
      });
    else {
      updatePromo({
        discountType: 'fixed',
        discountFixedAmount: promo.discountFixedAmount ?? 5,
        discountPercent: undefined,
      });
    }
  }

  if (!authOk || status !== 'ready' || !promo) {
    return (
      <div className="admin-scope flex min-h-dvh items-center justify-center bg-neutral-100 text-neutral-500">
        Yüklənir…
      </div>
    );
  }

  const input =
    'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-bold text-neutral-900';
  const label = 'block text-[11px] font-black uppercase text-neutral-500 mb-2';

  return (
    <div className="admin-scope min-h-dvh bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <button
            type="button"
            aria-label="Geri"
            onClick={() => cancelBack()}
            className="rounded-xl border border-neutral-200 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Yeni promo kod
            </p>
            <h1 className="truncate font-black">Yeni kod yaradıldı — redaktə edin</h1>
          </div>
          <Link
            to={ADMIN_ROUTES.panel}
            className="hidden shrink-0 text-sm font-bold text-primary underline sm:inline"
          >
            Panel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 pb-24">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div>
            <label className={label}>Promo kod</label>
            <input
              className={`${input} font-mono uppercase tracking-wide`}
              value={promo.code}
              placeholder="AUTO"
              onChange={(e) =>
                updatePromo({
                  code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                })
              }
            />
            <p className="mt-2 text-xs text-neutral-500">
              Kod avtomatik seçilib — fərqləndirmək üçün sərbəst dəyişin.
            </p>
          </div>

          <div>
            <span className={label}>Endirim tipi</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-black ${
                  promoDiscountDraft().discountType !== 'fixed' ?
                    'border-primary bg-primary/5 text-primary'
                  : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                Faiz %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-black ${
                  promoDiscountDraft().discountType === 'fixed' ?
                    'border-primary bg-primary/5 text-primary'
                  : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                Sabit ₼
              </button>
            </div>
          </div>

          {promoDiscountDraft().discountType === 'fixed' ?
            <div>
              <label className={label}>Endirim məbləği (₼)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className={`${input} font-black`}
                value={promo.discountFixedAmount ?? ''}
                onChange={(e) =>
                  updatePromo({
                    discountFixedAmount:
                      e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          : <div>
              <label className={label}>Endirim faizi</label>
              <input
                type="number"
                min={1}
                max={90}
                className={`${input} font-black`}
                value={promo.discountPercent ?? 10}
                onChange={(e) =>
                  updatePromo({
                    discountPercent: Math.min(
                      90,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </div>
          }

          <div className="space-y-2">
            <span className={label}>Status</span>
            <button
              type="button"
              className={`w-full rounded-2xl border px-4 py-4 text-left text-sm font-bold ${
                promo.activeOnWebsite ?
                  'border-primary bg-primary/5 text-primary'
                : 'border-neutral-200 bg-white text-neutral-600'
              }`}
              onClick={() =>
                updatePromo({
                  activeOnWebsite: !promo.activeOnWebsite,
                })
              }
            >
              {promo.activeOnWebsite ?
                'Saytda aktiv (səbətdə qəbul olunur)'
              : 'Saytda sönülü'}
            </button>
          </div>
        </form>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => cancelBack()}
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold"
          >
            Ləğv et
          </button>
          <Link
            to={`${ADMIN_ROUTES.panel}?tab=promos`}
            replace
            className="rounded-2xl bg-primary px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-primary/20"
          >
            Promo siyahısına qayıt
          </Link>
        </div>
      </main>
    </div>
  );
}
