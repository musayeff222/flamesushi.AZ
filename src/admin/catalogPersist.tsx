import { useEffect, useRef } from 'react';
import type { CatalogState } from '../types/catalog.ts';

export function cloneCatalogJson(c: CatalogState): CatalogState {
  return JSON.parse(JSON.stringify(c)) as CatalogState;
}

export function catalogToPutPayload(catalog: CatalogState): CatalogState {
  return {
    ...catalog,
    whatsapp: catalog.whatsapp.replace(/\D/g, ''),
  };
}

export async function putAdminCatalog(body: CatalogState): Promise<boolean> {
  try {
    const r = await fetch('/api/admin/catalog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(catalogToPutPayload(body)),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * catalogue serverə yükləndikdə lastSaved sıfırlanır;
 * draft dəyişəndə debounced PUT (səssiz, xəbərdarlıq yoxdur).
 */
export type AdminCatalogPersistOptions = {
  /** Uğurlu PUT-dan sonra (məs. client kataloqunu yenidən yükləmək üçün). */
  onPersistSuccess?: () => void;
};

export function useDebouncedAdminCatalogPersist(
  draft: CatalogState,
  baselineCatalog: CatalogState,
  options?: AdminCatalogPersistOptions,
): void {
  const lastSavedJson = useRef('');
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onOkRef = useRef(options?.onPersistSuccess);
  onOkRef.current = options?.onPersistSuccess;

  useEffect(() => {
    lastSavedJson.current = JSON.stringify(
      catalogToPutPayload(cloneCatalogJson(baselineCatalog)),
    );
  }, [baselineCatalog]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const payload = catalogToPutPayload(draftRef.current);
      const json = JSON.stringify(payload);
      if (json === lastSavedJson.current) return;
      void (async () => {
        const ok = await putAdminCatalog(draftRef.current);
        if (ok) {
          lastSavedJson.current = json;
          onOkRef.current?.();
        } else console.error('[admin] Kataloq serverə yazılmadı');
      })();
    }, 420);
    return () => window.clearTimeout(t);
  }, [draft]);
}
