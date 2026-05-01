import {
  Fragment,
  type Dispatch,
  type SetStateAction,
  useMemo,
  useState,
} from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Images,
  PencilLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CatalogState,
  HeroBannerSlide,
} from '../types/catalog.ts';
import { AdminLocalImageInput } from './AdminLocalImageInput.tsx';

type Props = {
  draft: CatalogState;
  setDraft: Dispatch<SetStateAction<CatalogState>>;
  dark: boolean;
};

function newSlideId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `hb-${Date.now()}`;
}

function emptySlide(carouselSeconds: number): HeroBannerSlide {
  const dur = Math.min(
    120,
    Math.max(2, Math.round(Number(carouselSeconds) || 4)),
  );
  return {
    id: newSlideId(),
    name: '',
    imageUrl: '',
    overlayProductName: '',
    overlayPriceLabel: '0 ₼',
    durationSeconds: dur,
  };
}

function SortableBannerPreview({
  slide,
  dark,
  onEdit,
  onRemove,
}: {
  slide: HeroBannerSlide;
  dark: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };
  const card =
    dark
      ? 'border-neutral-800 bg-neutral-900/85'
      : 'border-neutral-200 bg-white';
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center ${card}`}
    >
      <button
        type="button"
        className={
          dark
            ? 'self-start rounded-xl p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
            : 'self-start rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800'
        }
        aria-label="Sürüşdür"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-6 w-6" />
      </button>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div
          className={`relative h-20 w-32 shrink-0 overflow-hidden rounded-xl ${
            dark ? 'bg-neutral-800' : 'bg-neutral-100'
          }`}
        >
          {slide.imageUrl.trim() ?
            <img
              src={slide.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          : <div className="flex h-full items-center justify-center text-[10px] font-bold text-neutral-500">
              Şəkil yox
            </div>
          }
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="truncate font-black">
            {slide.name.trim() || 'Adsız banner'}
          </div>
          <div className="truncate text-xs text-neutral-500">
            {slide.overlayProductName.trim() || '—'} ·{' '}
            {slide.overlayPriceLabel.trim() || '—'}
          </div>
          <div className="text-[11px] text-neutral-500">
            Karusel:{' '}
            <span className="font-black text-primary">
              {slide.durationSeconds}s
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={
              dark ?
                'inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-xs font-black text-neutral-100'
              : 'inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-black text-neutral-900'
            }
          >
            <PencilLine className="h-4 w-4" /> Düzənlə
          </button>
          <button
            type="button"
            aria-label="Sil"
            className={`inline-flex rounded-xl p-2.5 font-bold ${
              dark ?
                'text-red-400 hover:bg-red-950/60'
              : 'text-red-600 hover:bg-red-50'
            }`}
            onClick={onRemove}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminBannersTab({ draft, setDraft, dark }: Props) {
  const carouselSeconds =
    draft.siteBanners.carouselSeconds ?? draft.siteBanners.slides[0]?.durationSeconds ?? 4;
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<HeroBannerSlide | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {}),
  );

  const slides = draft.siteBanners.slides ?? [];
  const ids = slides.map((s) => s.id);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return slides;
    return slides.filter((x) => x.name.toLowerCase().includes(s));
  }, [slides, q]);

  function syncLegacyUrls(nextSlides: HeroBannerSlide[]) {
    return {
      ...draft.siteBanners,
      slides: nextSlides,
      carouselSeconds:
        draft.siteBanners.carouselSeconds ?? carouselSeconds ?? 4,
      heroImageUrls: nextSlides.map((s) => s.imageUrl),
      featuredProductIds:
        draft.siteBanners.featuredProductIds?.length === nextSlides.length ?
          draft.siteBanners.featuredProductIds
        : nextSlides.map(() => ''),
    };
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(slides, oldIndex, newIndex);
    setDraft((d) => ({ ...d, siteBanners: syncLegacyUrls(moved) }));
  }

  const input =
    dark
      ? 'rounded-2xl border border-neutral-600 bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-100 w-full'
      : 'rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium w-full';
  const label = dark
    ? 'block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2'
    : 'block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <p className={dark ? 'text-sm text-neutral-400' : 'text-sm text-neutral-600'}>
        Əsas səhifə karuseli üçün slaytlar. Hər banner üçün ada görə axtarış və sürüşdürmə ilə
        sıra təyin olunur — dəyişikliklər avtomatik saxlanır.
      </p>

      <div className={`rounded-2xl border p-4 ${dark ? 'border-neutral-700 bg-neutral-900/70' : 'border-neutral-200 bg-white'}`}>
        <label className={label}>Varsayılan karusel müddəti (saniyə)</label>
        <input
          type="number"
          min={3}
          max={120}
          className={`${input} max-w-[140px]`}
          value={carouselSeconds}
          onChange={(e) => {
            const n = Number(e.target.value);
            const v =
              Number.isFinite(n) && n >= 2 ? Math.min(240, Math.round(n)) : 4;
            setDraft((d) => ({
              ...d,
              siteBanners: { ...d.siteBanners, carouselSeconds: v },
            }));
          }}
        />
        <p className={`mt-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
          Yeni slayt əlavə edərkən ilk müddət kimi istifadə olunur (hər slaytda fərdi seçim də
          mümkündür).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            className={`${input} pl-10`}
            placeholder="Banner adına görə axtarış…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setModal(emptySlide(carouselSeconds))}
          className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/25"
        >
          <Plus className="h-5 w-5" />
          Yeni banner əlavə et
        </button>
      </div>

      {q.trim() ?
        <div className="space-y-3">
          {filtered.length === 0 ?
            <p className={`py-8 text-center text-sm ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              Axtarışa uyğun banner yoxdur.
            </p>
          : filtered.map((s) => (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 text-sm opacity-95 ${
                  dark ? 'border-neutral-700 bg-neutral-900/85' : 'border-neutral-200 bg-white'
                }`}
              >
                <span className="font-black">{s.name.trim() || 'Adsız banner'}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-white"
                    onClick={() => setModal({ ...s })}
                  >
                    Redaktə
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      dark ? 'bg-red-950/60 text-red-300' : 'bg-red-50 text-red-700'
                    }`}
                    onClick={() => {
                      if (!confirm('Bu banner silinsin?')) return;
                      const next = slides.filter((x) => x.id !== s.id);
                      setDraft((d) => ({
                        ...d,
                        siteBanners: syncLegacyUrls(next),
                      }));
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))
          }
          <p className={`text-center text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Axtarış aktiv olanda sıralama üçün axtarışı təmizləyin.
          </p>
        </div>
      : <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {slides.length === 0 ?
                <div
                  className={
                    dark ?
                      'rounded-2xl border border-dashed border-neutral-700 py-16 text-center text-sm text-neutral-500'
                    : 'rounded-2xl border border-dashed border-neutral-300 py-16 text-center text-sm text-neutral-500'
                  }
                >
                  Hələ banner yoxdur — «Yeni banner əlavə et» düyməsini basın.
                </div>
              : slides.map((s) => (
                  <Fragment key={s.id}>
                    <SortableBannerPreview
                      slide={s}
                      dark={dark}
                      onEdit={() => setModal({ ...s })}
                      onRemove={() => {
                        if (!confirm('Bu banner silinsin?')) return;
                        const next = slides.filter((x) => x.id !== s.id);
                        setDraft((d) => ({
                          ...d,
                          siteBanners: syncLegacyUrls(next),
                        }));
                      }}
                    />
                  </Fragment>
                ))
              }
            </div>
          </SortableContext>
        </DndContext>
      }

      {modal ?
        <div className="fixed inset-0 z-50 flex touch-manipulation items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6">
          <div
            className={`max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${
              dark ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">
                {!slides.some((x) => x.id === modal.id) ? 'Yeni banner' : 'Banner redaktəsi'}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Bağla"
                className={
                  dark
                    ? 'rounded-xl p-2 text-neutral-400 hover:bg-neutral-800'
                    : 'rounded-xl p-2 text-neutral-500 hover:bg-neutral-100'
                }
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={label}>Banner adı</label>
                <input
                  className={input}
                  value={modal.name}
                  onChange={(e) =>
                    setModal({ ...modal, name: e.target.value })
                  }
                  placeholder="Məs.: Həftənin təklifi"
                />
              </div>

              <AdminLocalImageInput
                dark={dark}
                label="Banner şəkli"
                hint="Cihazdan yükləyin."
                value={modal.imageUrl}
                onChange={(url) =>
                  setModal({ ...modal, imageUrl: url })
                }
              />

              <div>
                <label className={label}>Şəkil üzərində — məhsul adı</label>
                <input
                  className={input}
                  value={modal.overlayProductName}
                  onChange={(e) =>
                    setModal({ ...modal, overlayProductName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={label}>Şəkil üzərində — qiymət mətni</label>
                <input
                  className={input}
                  value={modal.overlayPriceLabel}
                  onChange={(e) =>
                    setModal({ ...modal, overlayPriceLabel: e.target.value })
                  }
                  placeholder="Məs.: 39 ₼"
                />
              </div>

              <div>
                <label className={label}>Bu slaydın müddəti (saniyə)</label>
                <input
                  type="number"
                  min={2}
                  max={360}
                  className={`${input} max-w-[120px]`}
                  value={modal.durationSeconds}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setModal({
                      ...modal,
                      durationSeconds:
                        Number.isFinite(n) ?
                          Math.min(360, Math.max(2, Math.round(n)))
                        : modal.durationSeconds,
                    });
                  }}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={
                    dark
                      ? 'rounded-xl border border-neutral-700 px-5 py-3 text-sm font-bold'
                      : 'rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold'
                  }
                  onClick={() => setModal(null)}
                >
                  Ləğv et
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20"
                  onClick={() => {
                    const next =
                      slides.some((x) => x.id === modal.id) ?
                        slides.map((x) => (x.id === modal.id ? modal : x))
                      : [...slides, modal];
                    setDraft((d) => ({
                      ...d,
                      siteBanners: syncLegacyUrls(next),
                    }));
                    setModal(null);
                  }}
                >
                  <Images className="h-4 w-4" />
                  Əlavə / yenilə
                </button>
              </div>
            </div>
          </div>
        </div>
      : null}
    </div>
  );
}
