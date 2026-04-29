import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { CatalogState } from './types/catalog.ts';
import { defaultCatalogState, normalizeCatalogState } from './catalogDefaults.ts';

type Status = 'loading' | 'ready' | 'error';

interface CatalogCtx {
  catalog: CatalogState;
  status: Status;
  reload: () => Promise<void>;
}

const CatalogContext = createContext<CatalogCtx | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [catalog, setCatalog] = useState<CatalogState>(defaultCatalogState);
  const [status, setStatus] = useState<Status>('loading');

  const reload = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const r = await fetch('/api/catalog', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('catalog fetch failed');
      const json = (await r.json()) as unknown;
      setCatalog(normalizeCatalogState(json));
      setStatus('ready');
    } catch {
      setCatalog(defaultCatalogState);
      setStatus('error');
    }
  }, []);

  /** Hər əsas marşrut dəyişikliyində və admin-dən çıxanda serverdəki ən son JSON-u yükləyir */
  useEffect(() => {
    void reload();
  }, [location.pathname, reload]);

  const value = useMemo(
    () => ({ catalog, status, reload }),
    [catalog, status, reload],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return ctx;
}
