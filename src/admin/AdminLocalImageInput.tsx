import { type ChangeEvent, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';

export async function postAdminUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/api/admin/upload', {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok) {
    throw new Error(j.error || 'Yükləmə alınmadı');
  }
  if (!j.url) throw new Error('Server cavabsız');
  return j.url;
}

type Props = {
  label: string;
  /** Saxlanmış şəkilin URL-i (məs.: /uploads/...) və ya keçmiş kataloqda köhnə http linklər */
  value: string;
  onChange: (url: string) => void;
  dark: boolean;
  hint?: string;
  /** Kateqoriya kartı kimi sıx düzülüş */
  variant?: 'card' | 'row';
};

export function AdminLocalImageInput({
  label,
  value,
  onChange,
  dark,
  hint,
  variant = 'card',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const url = await postAdminUpload(file);
      onChange(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yükləmə xətası');
    } finally {
      setBusy(false);
    }
  }

  const border = dark ? 'border-neutral-700 bg-neutral-900/70' : 'border-neutral-200 bg-white';

  if (variant === 'row') {
    return (
      <div className="space-y-1">
        <span className={dark ? 'text-[10px] font-bold text-neutral-400' : 'text-[10px] font-bold text-neutral-500'}>
          {label}
        </span>
        {hint ?
          <p className="text-[10px] text-neutral-500">{hint}</p>
        : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          className="sr-only"
          tabIndex={-1}
          onChange={(ev) => void onPick(ev)}
        />
        <div className="flex items-center gap-3">
          {value.trim() ?
            <img
              src={value}
              alt=""
              className={`h-16 w-16 shrink-0 rounded-xl object-cover ${
                dark ? 'bg-neutral-800' : 'bg-neutral-100'
              }`}
              referrerPolicy="no-referrer"
            />
          : <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-[9px] font-bold leading-tight ${
                dark ?
                  'border border-dashed border-neutral-600 text-neutral-500'
                : 'border border-dashed border-neutral-300 text-neutral-400'
              }`}
            >
              —
            </div>
          }
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={`inline-flex touch-manipulation items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
              dark ? 'bg-primary text-white' : 'bg-primary text-white shadow-sm'
            } disabled:opacity-60`}
          >
            {busy ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                …
              </>
            : <>
                <ImagePlus className="h-4 w-4" />
                Seç
              </>
            }
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className={dark ? 'text-xs font-bold text-neutral-400' : 'text-xs font-bold text-neutral-500'}>
        {label}
      </span>
      {hint ? (
        <p className={dark ? 'text-[11px] text-neutral-500' : 'text-[11px] text-neutral-500'}>
          {hint}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(ev) => void onPick(ev)}
      />

      <div className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row ${border}`}>
        <div className="flex shrink-0 justify-center">
          {value.trim() ?
            <img
              src={value}
              alt=""
              className={`h-32 w-full max-w-[200px] rounded-xl object-cover sm:h-28 sm:w-28 ${
                dark ? 'bg-neutral-800' : 'bg-neutral-100'
              }`}
              referrerPolicy="no-referrer"
            />
          : <div
              className={`flex h-32 w-full max-w-[200px] items-center justify-center rounded-xl text-center text-[11px] font-bold leading-tight sm:h-28 sm:w-28 ${
                dark ? 'border border-dashed border-neutral-600 bg-neutral-950 text-neutral-500'
                : 'border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400'
              }`}
            >
              Şəkil seçilməyib
            </div>
          }
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={`inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
              dark
                ? 'bg-primary text-white hover:opacity-95'
                : 'bg-primary text-white shadow-sm hover:opacity-95'
            } disabled:opacity-60`}
          >
            {busy ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Göndərilir…
              </>
            : <>
                <ImagePlus className="h-4 w-4 shrink-0" />
                Fayldan seç (qaleriya və ya foto)
              </>
            }
          </button>
          {value.trim() ?
            <button
              type="button"
              className={`text-xs font-bold underline ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}
              onClick={() => {
                if (confirm('Şəkili silibsə nümayişdə boş qalacaq. Davam etmək?'))
                  onChange('');
              }}
            >
              Lazım deyil — təmizlə
            </button>
          : null}
        </div>
      </div>
    </div>
  );
}
