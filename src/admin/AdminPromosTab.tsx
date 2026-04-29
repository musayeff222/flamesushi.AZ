import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import {
  Calendar,
  Copy,
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
} from 'lucide-react';
import type { CatalogState, PromoCodeEntry } from '../types/catalog.ts';

type Props = {
  draft: CatalogState;
  setDraft: Dispatch<SetStateAction<CatalogState>>;
  dark: boolean;
};

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Saniyənin sonu kimi son tarix üçün müqayisə */
function statusFor(promo: PromoCodeEntry): {
  key: string;
  short: string;
} {
  if (!promo.activeOnWebsite)
    return { key: 'off', short: 'Saytda söndürülüb' };
  const now = Date.now();
  if (promo.validFrom) {
    const t = new Date(`${promo.validFrom}T00:00:00`).getTime();
    if (Number.isFinite(t) && now < t)
      return { key: 'upcoming', short: `${promo.validFrom} tarixindən aktiv` };
  }
  if (promo.validTo) {
    const t = new Date(`${promo.validTo}T23:59:59`).getTime();
    if (Number.isFinite(t) && now > t) return { key: 'past', short: 'Müddəti bitib' };
  }
  return { key: 'live', short: 'Aktiv' };
}

const PRESET_PCT = [5, 10, 15, 20, 25, 30] as const;

export function AdminPromosTab({ draft, setDraft, dark }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const promos = draft.promoCodes ?? [];

  const sorted = useMemo(() => {
    return [...promos].sort((a, b) => {
      const sa = statusFor(a);
      const sb = statusFor(b);
      const prio = { live: 0, upcoming: 1, past: 2, off: 3 };
      const d = prio[sa.key as keyof typeof prio] - prio[sb.key as keyof typeof prio];
      if (d !== 0) return d;
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    });
  }, [promos]);

  const pillBase =
    'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide';

  function addPromo() {
    const id = globalThis.crypto?.randomUUID?.() ?? `promo-${Date.now()}`;
    const entry: PromoCodeEntry = {
      id,
      code: 'YENI10',
      discountPercent: 10,
      activeOnWebsite: true,
      createdAt: nowIsoDate(),
    };
    setDraft((d) => ({
      ...d,
      promoCodes: [...(d.promoCodes ?? []), entry],
    }));
  }

  function updatePromo(id: string, patch: Partial<PromoCodeEntry>) {
    setDraft((d) => ({
      ...d,
      promoCodes: (d.promoCodes ?? []).map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }));
  }

  function removePromo(id: string) {
    if (!confirm('Promo kodu silinsin?')) return;
    setDraft((d) => ({
      ...d,
      promoCodes: (d.promoCodes ?? []).filter((p) => p.id !== id),
    }));
  }

  async function copyCode(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId((x) => (x === id ? null : x)), 1500);
    } catch {
      alert('Kopyalanmadı — brauzer icazəsi yoxdur');
    }
  }

  const card =
    dark
      ? 'rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-sm'
      : 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm';

  const inputBase =
    'w-full rounded-xl border px-3 py-3 text-base font-bold outline-none ring-primary/30 focus-visible:ring-2 sm:text-sm';
  const input =
    dark
      ? `${inputBase} border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600`
      : `${inputBase} border-neutral-200 bg-white text-neutral-900`;

  const label = dark ? 'text-[11px] font-black uppercase text-neutral-500' : 'text-[11px] font-black uppercase text-neutral-500';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-4">
      <div
        className={
          dark ?
            'rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 text-sm leading-relaxed text-neutral-300'
          : 'rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600'
        }
      >
        <p className={dark ? 'font-black text-neutral-100' : 'font-black text-neutral-900'}>
          Promo kod necə işləyir?
        </p>
        <p className="mt-1">
          Səbətdə endirimi yoxlamaq üçün istifadə olunur; başlanğıc / son tarixi boş qalsa — müddət
          məhdudiyyəti olmur. Kodları böyük hərflə saxlamağı tövsiyə edirik.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Tag className="text-primary h-6 w-6" /> Promo kodlar
        </h2>
        <button
          type="button"
          onClick={addPromo}
          className="inline-flex touch-manipulation items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/25"
        >
          <Plus className="h-5 w-5" /> Yeni promo
        </button>
      </div>

      {sorted.length === 0 ?
        <div
          className={
            dark ?
              'rounded-2xl border border-dashed border-neutral-700 py-16 text-center text-neutral-500'
            : 'rounded-2xl border border-dashed border-neutral-300 py-16 text-center text-neutral-500'
          }
        >
          Hələ promo yoxdur — «Yeni promo» ilə əlavə edin.
        </div>
      : <ul className="flex flex-col gap-4">
          {sorted.map((p) => {
            const st = statusFor(p);
            const chip =
              st.key === 'live' ?
                `${pillBase} ${dark ? 'bg-emerald-950/80 text-emerald-300' : 'bg-emerald-50 text-emerald-800'}`
              : st.key === 'upcoming' ?
                `${pillBase} ${dark ? 'bg-amber-950/80 text-amber-200' : 'bg-amber-50 text-amber-900'}`
              : st.key === 'past' ?
                `${pillBase} ${dark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-600'}`
              : `${pillBase} ${dark ? 'bg-red-950/70 text-red-300' : 'bg-red-50 text-red-800'}`;

            return (
              <li key={p.id}>
                <article className={`${card} space-y-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className={chip}>{st.short}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyCode(p.code.trim(), p.id)}
                        className={`inline-flex touch-manipulation items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
                          copiedId === p.id ?
                            dark ?
                              'bg-emerald-900/70 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-900'
                          : dark ?
                            'bg-neutral-800 text-neutral-100'
                          : 'bg-neutral-100 text-neutral-900'
                        }`}
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === p.id ? 'Kopyalandı' : 'Kodu kopyala'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePromo(p.id)}
                        className={`inline-flex touch-manipulation items-center rounded-xl bg-red-500/15 p-2.5 font-bold ${
                          dark ? 'text-red-400' : 'text-red-600'
                        }`}
                        aria-label="Sil"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`mb-1.5 block ${label}`}>Kod</label>
                    <input
                      className={`${input} font-mono uppercase tracking-wider`}
                      value={p.code}
                      placeholder="Məs: YENI15"
                      inputMode="text"
                      autoCapitalize="characters"
                      onChange={(e) =>
                        updatePromo(p.id, {
                          code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                        })
                      }
                    />
                  </div>

                  <div>
                    <span className={`mb-2 block ${label}`}>Endirim faizi</span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_PCT.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updatePromo(p.id, { discountPercent: n })}
                          className={`touch-manipulation rounded-xl px-4 py-2.5 text-sm font-black ${
                            p.discountPercent === n ?
                              'bg-primary text-white shadow-md'
                            : dark ?
                              'bg-neutral-800 text-neutral-200'
                            : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {n}%
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={dark ? 'text-sm text-neutral-400' : 'text-sm text-neutral-500'}>
                        Düz dəyiş:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        className={`${input} w-24`}
                        value={p.discountPercent}
                        onChange={(e) =>
                          updatePromo(p.id, {
                            discountPercent: Math.min(
                              90,
                              Math.max(1, Number(e.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updatePromo(p.id, { activeOnWebsite: !p.activeOnWebsite })
                    }
                    className={`flex w-full touch-manipulation flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold ${
                      dark
                        ? `border-neutral-700 ${
                            p.activeOnWebsite ? 'bg-neutral-800/80' : 'bg-neutral-950'
                          }`
                        : `border-neutral-200 ${
                            p.activeOnWebsite ? 'bg-primary/5' : 'bg-neutral-50'
                          }`
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ToggleLeft
                        className={`h-6 w-6 shrink-0 ${
                          p.activeOnWebsite ? 'text-primary' : 'text-neutral-400'
                        }`}
                      />
                      Saytda aktiv (səbətdə yoxlanılsın)
                    </span>
                    <span
                      className={
                        p.activeOnWebsite ?
                          'font-black text-primary'
                        : 'text-neutral-500'
                      }
                    >
                      {p.activeOnWebsite ? 'Açıq' : 'Bağlı'}
                    </span>
                  </button>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 flex items-center gap-2 ${label}`}>
                        <Calendar className="h-3.5 w-3.5" /> Başlanğıc (istəyə bağlı)
                      </label>
                      <input
                        type="date"
                        className={input}
                        value={p.validFrom ?? ''}
                        onChange={(e) =>
                          updatePromo(p.id, {
                            validFrom: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className={`mb-1.5 flex items-center gap-2 ${label}`}>
                        <Calendar className="h-3.5 w-3.5" /> Son (istəyə bağlı)
                      </label>
                      <input
                        type="date"
                        className={input}
                        value={p.validTo ?? ''}
                        onChange={(e) =>
                          updatePromo(p.id, {
                            validTo: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  <p className={`text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    Yaradılıb: {p.createdAt || '—'}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      }

      <p className="text-center text-xs text-neutral-500">
        Əvvəl «Yadda saxla» düyməsi ilə dəyişikliklər serverdə saxlanılır.
      </p>
    </div>
  );
}
