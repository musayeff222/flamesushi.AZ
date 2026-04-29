import { type Dispatch, type SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CatalogState } from '../types/catalog.ts';
import { AdminLocalImageInput } from './AdminLocalImageInput.tsx';

type Props = {
  draft: CatalogState;
  setDraft: Dispatch<SetStateAction<CatalogState>>;
  dark: boolean;
};

export function AdminBannersTab({ draft, setDraft, dark }: Props) {
  const sb = draft.siteBanners;
  const input = dark
    ? 'rounded-2xl border border-neutral-600 bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-100 w-full'
    : 'rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium w-full';
  const label = dark
    ? 'block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2'
    : 'block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2';
  const card = dark
    ? 'rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 space-y-3'
    : 'rounded-2xl border border-neutral-200 bg-white p-4 space-y-3';

  function padFeatured(len: number) {
    const next = [...(sb.featuredProductIds ?? [])];
    while (next.length < len) next.push('');
    return next.slice(0, len);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className={dark ? 'text-sm text-neutral-400' : 'text-sm text-neutral-500'}>
        Ana səhifə karuseli — şəkilləri cihazdan yükləyin; hər slayt üçün məhsul (istəyə bağlı).
      </p>

      <div className={card}>
        <label className={label}>Karusel keçid müddəti (saniyə)</label>
        <input
          type="number"
          min={3}
          max={60}
          className={`${input} max-w-[120px]`}
          value={sb.carouselSeconds}
          onChange={(e) => {
            const n = Number(e.target.value);
            setDraft((d) => ({
              ...d,
              siteBanners: {
                ...d.siteBanners,
                carouselSeconds: Number.isFinite(n) && n >= 3 ? n : 4,
              },
            }));
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black text-lg">Baner şəkilləri</h3>
          <button
            type="button"
            onClick={() =>
              setDraft((d) => {
                const urls = [...d.siteBanners.heroImageUrls, ''];
                const feat = padFeatured(urls.length);
                return {
                  ...d,
                  siteBanners: {
                    ...d.siteBanners,
                    heroImageUrls: urls,
                    featuredProductIds: feat,
                  },
                };
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-white font-bold px-3 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Sətir əlavə et
          </button>
        </div>

        {sb.heroImageUrls.map((url, idx) => (
          <div
            key={idx}
            className={
              dark
                ? 'flex flex-col sm:flex-row gap-2 p-3 rounded-2xl border border-neutral-700 bg-neutral-900/50'
                : 'flex flex-col sm:flex-row gap-2 p-3 rounded-2xl border border-neutral-200 bg-white'
            }
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <AdminLocalImageInput
                dark={dark}
                label={`Baner şəkli #${idx + 1}`}
                hint="Yalnız cihaz yaddaşından (qalereya və ya fayllar)."
                value={url}
                onChange={(next) => {
                  setDraft((d) => {
                    const urls = [...d.siteBanners.heroImageUrls];
                    urls[idx] = next;
                    return {
                      ...d,
                      siteBanners: {
                        ...d.siteBanners,
                        heroImageUrls: urls,
                      },
                    };
                  });
                }}
              />
            </div>
            <div className="sm:w-56 shrink-0">
              <label className={dark ? `${label} mb-1` : `${label} mb-1`}>
                Məhsul (slayt üçün)
              </label>
              <select
                className={input}
                value={(sb.featuredProductIds ?? [])[idx] ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => {
                    const feat = padFeatured(d.siteBanners.heroImageUrls.length);
                    feat[idx] = v;
                    return {
                      ...d,
                      siteBanners: { ...d.siteBanners, featuredProductIds: feat },
                    };
                  });
                }}
              >
                <option value="">— seçilməyib —</option>
                {draft.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              aria-label="Sil"
              className={
                dark
                  ? 'self-end sm:self-center p-3 rounded-xl text-red-400 hover:bg-neutral-800'
                  : 'self-end sm:self-center p-3 rounded-xl text-red-600 hover:bg-red-50'
              }
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  siteBanners: {
                    ...d.siteBanners,
                    heroImageUrls: d.siteBanners.heroImageUrls.filter(
                      (_, i) => i !== idx,
                    ),
                    featuredProductIds: (
                      d.siteBanners.featuredProductIds ?? []
                    ).filter((_, i) => i !== idx),
                  },
                }))
              }
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}

        {sb.heroImageUrls.length === 0 && (
          <p className={dark ? 'text-neutral-500 text-sm' : 'text-neutral-500 text-sm'}>
            Hələ şəkil yoxdur — «Sətir əlavə et» düyməsini basın.
          </p>
        )}
      </div>
    </div>
  );
}
