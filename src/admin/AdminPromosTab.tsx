import { type Dispatch, type SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CatalogState, PromoCodeEntry } from '../types/catalog.ts';

type Props = {
  draft: CatalogState;
  setDraft: Dispatch<SetStateAction<CatalogState>>;
  dark: boolean;
};

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminPromosTab({ draft, setDraft, dark }: Props) {
  const input = dark
    ? 'rounded-xl border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 w-full'
    : 'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm w-full';
  const th = dark
    ? 'px-3 py-2 text-left text-[10px] uppercase text-neutral-500'
    : 'px-3 py-2 text-left text-[10px] uppercase text-neutral-500';
  const td = dark
    ? 'px-3 py-2 border-t border-neutral-700 text-sm'
    : 'px-3 py-2 border-t border-neutral-100 text-sm';

  const promos = draft.promoCodes ?? [];

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

  const expiredOrOff = promos.filter((p) => {
    if (!p.activeOnWebsite) return true;
    const now = Date.now();
    if (p.validFrom) {
      const t = new Date(`${p.validFrom}T00:00:00`).getTime();
      if (Number.isFinite(t) && now < t) return true;
    }
    if (p.validTo) {
      const t = new Date(`${p.validTo}T23:59:59`).getTime();
      if (Number.isFinite(t) && now > t) return true;
    }
    return false;
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={dark ? 'text-sm text-neutral-400' : 'text-sm text-neutral-500'}>
          Endirim faizi sayt səbətində promo kod yoxlanması ilə işləyir (tarix boş olsa — limitsiz).
        </p>
        <button
          type="button"
          onClick={addPromo}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white font-bold px-4 py-2.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          Promo əlavə et
        </button>
      </div>

      <div>
        <h3 className="font-black text-lg mb-3">Aktiv / təyin olunmuş</h3>
        <div className={dark ? 'overflow-x-auto rounded-2xl border border-neutral-700' : 'overflow-x-auto rounded-2xl border border-neutral-200'}>
          <table className="min-w-full">
            <thead className={dark ? 'bg-neutral-800/80' : 'bg-neutral-50'}>
              <tr>
                <th className={th}>Kod</th>
                <th className={th}>%</th>
                <th className={th}>Sayt</th>
                <th className={th}>Başlanğıc</th>
                <th className={th}>Son</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <input
                      className={input}
                      value={p.code}
                      onChange={(e) =>
                        updatePromo(p.id, { code: e.target.value })
                      }
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      className={`${input} w-20`}
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
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      checked={p.activeOnWebsite}
                      onChange={(e) =>
                        updatePromo(p.id, { activeOnWebsite: e.target.checked })
                      }
                      className="w-5 h-5 accent-primary"
                    />
                  </td>
                  <td className={td}>
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
                  </td>
                  <td className={td}>
                    <input
                      type="date"
                      className={input}
                      value={p.validTo ?? ''}
                      onChange={(e) =>
                        updatePromo(p.id, { validTo: e.target.value || undefined })
                      }
                    />
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => removePromo(p.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {promos.length === 0 && (
          <p className="text-sm text-neutral-500 py-6">Promo kod yoxdur.</p>
        )}
      </div>

      <div>
        <h3 className="font-black text-lg mb-2">Tarixçə / bitmiş</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Avtomatik ayırma: son tarix keçmiş və ya saytda söndürülmüş kodlar.
        </p>
        <ul
          className={
            dark
              ? 'rounded-2xl border border-neutral-700 divide-y divide-neutral-700'
              : 'rounded-2xl border border-neutral-200 divide-y divide-neutral-100'
          }
        >
          {expiredOrOff.length === 0 ? (
            <li className="p-4 text-sm text-neutral-500">Boşdur.</li>
          ) : (
            expiredOrOff.map((p) => (
              <li
                key={p.id}
                className={
                  dark
                    ? 'p-4 flex flex-wrap justify-between gap-2 text-sm text-neutral-300'
                    : 'p-4 flex flex-wrap justify-between gap-2 text-sm text-neutral-600'
                }
              >
                <span className="font-mono font-bold">{p.code}</span>
                <span>{p.discountPercent}%</span>
                <span>
                  {p.validTo ? `son: ${p.validTo}` : '—'}
                  {!p.activeOnWebsite ? ' · saytda deaktiv' : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
