import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Images,
  LogOut,
  Menu,
  Moon,
  Package,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Tags,
  TicketPercent,
  PencilLine,
  Trash2,
  X,
} from 'lucide-react';
import type { CatalogState, Category, Product } from '../types/catalog.ts';
import { useCatalog } from '../CatalogContext.tsx';
import { defaultCatalogState } from '../catalogDefaults.ts';
import { ADMIN_ROUTES } from './paths.ts';
import { AdminBannersTab } from './AdminBannersTab.tsx';
import { AdminPromosTab } from './AdminPromosTab.tsx';

type Tab =
  | 'banners'
  | 'categories'
  | 'products'
  | 'promos'
  | 'site';

const ADMIN_THEME_KEY = 'flamesushi_admin_theme_dark';

function cloneCatalog(c: CatalogState): CatalogState {
  return JSON.parse(JSON.stringify(c)) as CatalogState;
}

async function fetchAuth(): Promise<{
  authenticated: boolean;
  reason?:
    | 'mysql_not_configured'
    | 'session_not_configurable';
}> {
  const r = await fetch('/api/admin/me', { credentials: 'include' });
  const j = (await r.json()) as {
    authenticated?: boolean;
    reason?:
      | 'mysql_not_configured'
      | 'session_not_configurable';
  };
  return {
    authenticated: Boolean(j.authenticated),
    ...(j.reason ? { reason: j.reason } : {}),
  };
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { catalog, reload } = useCatalog();

  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>('banners');
  const [draft, setDraft] = useState<CatalogState>(() =>
    cloneCatalog(defaultCatalogState),
  );
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_THEME_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  useEffect(() => {
    void (async () => {
      const auth = await fetchAuth();
      setAuthReady(true);
      if (auth.reason === 'mysql_not_configured') {
        alert(
          'MySQL üçün .envdə MYSQL_USER, MYSQL_DATABASE (və MYSQL_PASSWORD) təyin edin.',
        );
        navigate('/');
        return;
      }
      if (auth.reason === 'session_not_configurable') {
        alert(
          'ADMIN_SESSION_SECRET yazın və ya ADMIN_EMAIL + MYSQL_DATABASE birlikdə təyin edin.',
        );
        navigate('/');
        return;
      }
      if (!auth.authenticated) {
        navigate(ADMIN_ROUTES.login, { replace: true });
        return;
      }
      setLoggedIn(true);
    })();
  }, [navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_THEME_KEY, dark ? '1' : '0');
    } catch {
      /* ignored */
    }
  }, [dark]);

  useEffect(() => {
    setDraft(cloneCatalog(catalog));
  }, [catalog]);

  const logout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    navigate(ADMIN_ROUTES.login, { replace: true });
  }, [navigate]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        ...draft,
        whatsapp: draft.whatsapp.replace(/\D/g, ''),
      };
      const r = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        alert(err.error || 'Yadda saxlama alınmadı');
        return;
      }
      await reload();
      alert('Yadda saxlanıldı');
    } catch {
      alert('Şəbəkə xətası');
    } finally {
      setSaving(false);
    }
  }, [draft, reload]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return draft.products.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [draft.products, search, catFilter]);

  const sortedFilteredProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const oa = a.sortOrder ?? 9999;
      const ob = b.sortOrder ?? 9999;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, 'az');
    });
  }, [filteredProducts]);

  const openNewProduct = () => {
    const id = globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}`;
    const firstCat = draft.categories[0]?.id ?? 'sets';
    setIsNewProduct(true);
    setProductModal({
      id,
      name: '',
      description: '',
      price: 0,
      category: firstCat,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=600',
      popular: false,
      sortOrder: 500,
      availabilityNote: '',
    });
  };

  const upsertProduct = (p: Product) => {
    setDraft((prev) => {
      const exists = prev.products.some((x) => x.id === p.id);
      const products = exists
        ? prev.products.map((x) => (x.id === p.id ? p : x))
        : [...prev.products, p];
      return { ...prev, products };
    });
    setProductModal(null);
  };

  const deleteProduct = (id: string) => {
    if (!confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) return;
    setDraft((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const upsertCategory = (c: Category) => {
    setDraft((prev) => {
      const exists = prev.categories.some((x) => x.id === c.id);
      const categories = exists
        ? prev.categories.map((x) => (x.id === c.id ? c : x))
        : [...prev.categories, c];
      return { ...prev, categories };
    });
  };

  const deleteCategory = (id: string) => {
    if (draft.products.some((p) => p.category === id)) {
      alert('Bu kateqoriyada məhsul var — əvvəl məhsulları başqa kateqoriyaya köçürün.');
      return;
    }
    if (!confirm('Kateqoriyanı silmək?')) return;
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  const navItems = [
    { id: 'banners' as const, label: 'Banerlər', Icon: Images },
    { id: 'categories' as const, label: 'Məhsul qrupları', Icon: Tags },
    { id: 'products' as const, label: 'Məhsullar', Icon: Package },
    { id: 'promos' as const, label: 'Promo kodlar', Icon: TicketPercent },
    { id: 'site' as const, label: 'Sayt / WhatsApp', Icon: Settings2 },
  ] as const;

  if (!authReady || !loggedIn) {
    return (
      <div className="admin-scope min-h-dvh flex items-center justify-center bg-neutral-100 text-neutral-500">
        Yüklənir…
      </div>
    );
  }

  return (
    <div
      className={`admin-scope flex min-h-dvh w-full select-text ${
        dark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Örtü"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex max-w-[min(17rem,100%)] flex-col border-r transition-transform duration-200 lg:static lg:max-w-[17rem] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200/20 p-4">
          <span className="flex items-center gap-2 truncate font-black">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            Panel
          </span>
          <button
            type="button"
            className={`rounded-lg p-2 lg:hidden ${dark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
            onClick={() => setSidebarOpen(false)}
            aria-label="Bağla"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                tab === id
                  ? 'bg-primary text-white shadow-md'
                  : dark
                    ? 'text-neutral-300 hover:bg-neutral-800'
                    : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className={`border-t p-3 ${dark ? 'border-neutral-800' : 'border-neutral-100'}`}>
          <button
            type="button"
            onClick={() => setDark((x) => !x)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${
              dark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100 text-neutral-800'
            }`}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? 'İşıqlı tema' : 'Gecə rejimi'}
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3 backdrop-blur sm:px-4 ${
            dark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white/95'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={`inline-flex rounded-xl p-2 font-bold lg:hidden ${
                dark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100'
              }`}
              onClick={() => setSidebarOpen(true)}
              aria-label="Menyu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Sayt
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saxlanır…' : 'Yadda saxla'}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
                dark ? 'border border-neutral-700 bg-neutral-900' : 'border border-neutral-200 bg-white'
              }`}
            >
              <LogOut className="h-4 w-4" />
              Çıxış
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-3 py-6 pb-28 sm:px-6">
        {tab === 'banners' && (
          <AdminBannersTab draft={draft} setDraft={setDraft} dark={dark} />
        )}
        {tab === 'promos' && (
          <AdminPromosTab draft={draft} setDraft={setDraft} dark={dark} />
        )}
        {tab === 'products' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Axtarış (ad, təsvir)…"
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-neutral-200 bg-white text-sm font-medium"
                  />
                </div>
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="w-full sm:w-56 py-3 px-3 rounded-2xl border border-neutral-200 bg-white text-sm font-bold"
                >
                  <option value="all">Bütün kateqoriyalar</option>
                  {draft.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={openNewProduct}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-white font-bold px-4 py-3 text-sm"
              >
                <Plus className="w-4 h-4" />
                Yeni məhsul
              </button>
            </div>

            <div className="grid gap-3 sm:hidden">
              {sortedFilteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-4 flex gap-3"
                >
                  <img
                    src={p.image}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover bg-neutral-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-neutral-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {draft.categories.find((c) => c.id === p.category)?.name ??
                        p.category}
                    </div>
                    <div className="text-primary font-black mt-1">
                      {(p.discountPrice ?? p.price).toFixed(2)} ₼
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      className="p-2 rounded-xl bg-neutral-100"
                      aria-label="Redaktə"
                      onClick={() => {
                        setIsNewProduct(false);
                        setProductModal({ ...p });
                      }}
                    >
                      <PencilLine className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-xl bg-red-50 text-red-600"
                      aria-label="Sil"
                      onClick={() => deleteProduct(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-neutral-500 py-10">
                  Bu filtrdə məhsul yoxdur.
                </p>
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Şəkil</th>
                    <th className="px-4 py-3">Ad</th>
                    <th className="px-4 py-3">Kateqoriya</th>
                    <th className="px-4 py-3">Qiymət</th>
                    <th className="px-4 py-3 text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredProducts.map((p) => (
                    <tr key={p.id} className="border-t border-neutral-100">
                      <td className="px-4 py-2">
                        <img
                          src={p.image}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-neutral-100"
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td className="px-4 py-2 font-semibold max-w-[220px]">
                        <span className="line-clamp-2">{p.name}</span>
                        {p.popular ? (
                          <span className="ml-2 text-[10px] font-black text-primary uppercase">
                            populyar
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {draft.categories.find((c) => c.id === p.category)?.name ??
                          p.category}
                      </td>
                      <td className="px-4 py-2 font-black text-primary">
                        {(p.discountPrice ?? p.price).toFixed(2)} ₼
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-neutral-100 font-bold mr-2"
                          onClick={() => {
                            setIsNewProduct(false);
                            setProductModal({ ...p });
                          }}
                        >
                          <PencilLine className="w-4 h-4" /> Redaktə
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-red-50 text-red-700 font-bold"
                          onClick={() => deleteProduct(p.id)}
                        >
                          <Trash2 className="w-4 h-4" /> Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'categories' && (
          <section className="grid gap-3 sm:grid-cols-2">
            <CategoryCard
              onAdd={() => {
                const id =
                  prompt('Kateqoriya ID (ingilis, nöqtəsiz)')?.trim().toLowerCase() ??
                  '';
                if (!id) return;
                if (draft.categories.some((c) => c.id === id)) {
                  alert('Bu ID mövcuddur');
                  return;
                }
                const name =
                  prompt('Kateqoriya adı (nümayiş üçün)')?.trim() ?? '';
                upsertCategory({
                  id,
                  name: name || id,
                  image:
                    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=200',
                });
              }}
            />
            {draft.categories.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 flex gap-4"
              >
                <img
                  src={c.image}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover bg-neutral-100"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase text-neutral-400">
                    ID: {c.id}
                  </div>
                  <div className="font-black text-lg">{c.name}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-neutral-100 font-bold px-3 py-2 text-sm"
                      onClick={() => {
                        const name = prompt('Yeni ad', c.name) ?? c.name;
                        const img = prompt('Şəkil URL', c.image) ?? c.image;
                        upsertCategory({ ...c, name, image: img });
                      }}
                    >
                      Redaktə
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-red-50 text-red-700 font-bold px-3 py-2 text-sm"
                      onClick={() => deleteCategory(c.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'site' && (
          <section className="max-w-xl bg-white rounded-3xl border border-neutral-200 p-6 space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                WhatsApp (yalnız rəqəm)
              </label>
              <input
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
                value={draft.whatsapp}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    whatsapp: e.target.value.replace(/[^\d+]/g, ''),
                  }))
                }
                inputMode="numeric"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Nömrə üçün sifariş linkləri yaradılır (məs.: 994xxxxxxxxx).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                  Açılış
                </label>
                <input
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
                  value={draft.businessHours.open}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      businessHours: { ...d.businessHours, open: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                  Bağlanış
                </label>
                <input
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
                  value={draft.businessHours.close}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      businessHours: {
                        ...d.businessHours,
                        close: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </section>
        )}
      </main>
      </div>

      {productModal && (
        <ProductModal
          product={productModal}
          categories={draft.categories}
          isNew={isNewProduct}
          onClose={() => setProductModal(null)}
          onSave={(p) => upsertProduct(p)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-neutral-200 p-4 z-30">
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-white font-black py-4 shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {saving ? 'Saxlanır…' : 'Yadda saxla'}
        </button>
      </div>
    </div>
  );
}

function CategoryCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="border-2 border-dashed border-neutral-300 rounded-2xl p-6 flex items-center justify-center gap-2 font-black text-neutral-600 hover:border-primary hover:text-primary transition min-h-[120px]"
    >
      <Plus className="w-5 h-5" />
      Yeni kateqoriya
    </button>
  );
}

function ProductModal({
  product,
  categories,
  isNew,
  onClose,
  onSave,
}: {
  product: Product;
  categories: Category[];
  isNew: boolean;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [draft, setDraft] = useState<Product>(() => ({ ...product }));

  useEffect(() => {
    setDraft({ ...product });
  }, [product]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const price = Number(draft.price);
    let discountPrice = draft.discountPrice;
    if (discountPrice !== undefined) {
      const d = Number(discountPrice);
      discountPrice = Number.isFinite(d) && d > 0 ? d : undefined;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert('Qiyməti düzgün daxil edin');
      return;
    }
    if (!draft.name.trim()) {
      alert('Ad boş ola bilməz');
      return;
    }
    if (!draft.image.trim()) {
      alert('Şəkil üçün URL yazın');
      return;
    }
    const dp =
      typeof discountPrice === 'number' &&
      Number.isFinite(discountPrice) &&
      discountPrice > 0 &&
      discountPrice < price
        ? discountPrice
        : undefined;
    let sortOrder: number | undefined;
    if (
      draft.sortOrder !== undefined &&
      draft.sortOrder !== null &&
      String(draft.sortOrder) !== ''
    ) {
      const s = Number(draft.sortOrder);
      if (Number.isFinite(s)) sortOrder = Math.round(s);
    }
    let discountPercentField: number | undefined;
    if (
      draft.discountPercent !== undefined &&
      draft.discountPercent !== null &&
      String(draft.discountPercent) !== ''
    ) {
      const p = Number(draft.discountPercent);
      if (Number.isFinite(p) && p > 0 && p <= 100)
        discountPercentField = Math.round(p);
    }
    const availabilityNote =
      draft.availabilityNote?.trim() ?
        draft.availabilityNote.trim().slice(0, 1600)
      : undefined;

    onSave({
      ...draft,
      price,
      discountPrice: dp,
      sortOrder,
      discountPercent: discountPercentField,
      availabilityNote,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-black text-lg">
            {isNew ? 'Yeni məhsul' : 'Məhsulu redaktə et'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 font-bold bg-neutral-100"
          >
            Bağla
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {!isNew ? (
            <>
              <label className="block text-xs font-bold text-neutral-500 uppercase">
                Məhsul ID (dəyişməz)
              </label>
              <input
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-mono text-sm bg-neutral-100"
                value={draft.id}
                readOnly
                disabled
              />
            </>
          ) : (
            <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
              Yeni məhsul üçün sistem avtomatik ID təyin edir — sizdən tələb olunmur.
            </p>
          )}
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Ad
          </label>
          <input
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
          />
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Təsvir
          </label>
          <textarea
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 min-h-[90px]"
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
          />
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Siyahı sırası (ədəd — kiçik əvvəl gəlir)
          </label>
          <input
            type="number"
            step="1"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
            placeholder="500"
            value={draft.sortOrder ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sortOrder:
                  e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
          />
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Endirim faizi (%)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            placeholder="Informasiya (məs. 15)"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
            value={draft.discountPercent ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                discountPercent:
                  e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
          />
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Əlavə məlumat (saat, çatdırılma məhdudiyyəti və s.)
          </label>
          <textarea
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 min-h-[70px]"
            placeholder="İstəyə bağlı"
            value={draft.availabilityNote ?? ''}
            onChange={(e) =>
              setDraft((d) => ({ ...d, availabilityNote: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase">
                Qiymət (₼)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-black"
                value={draft.price}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    price: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase">
                Endirim qiyməti (əlavə deyilsə boş saxlayın)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold"
                value={draft.discountPrice ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    discountPrice: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Kateqoriya
          </label>
          <select
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-bold bg-white"
            value={draft.category}
            onChange={(e) =>
              setDraft((d) => ({ ...d, category: e.target.value }))
            }
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="block text-xs font-bold text-neutral-500 uppercase">
            Şəkil URL
          </label>
          <input
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-mono text-xs"
            value={draft.image}
            onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
          />
          <label className="flex items-center gap-3 font-bold text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(draft.popular)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, popular: e.target.checked }))
              }
              className="w-5 h-5 accent-primary rounded"
            />
            Populyar məhsul (banner üçün)
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-primary text-white font-black py-4 shadow-lg shadow-primary/20"
          >
            Məhsulu layihədə tətbiq et
          </button>
          <p className="text-xs text-neutral-500 text-center pb-4">
            Serverə yazmaq üçün paneldə &quot;Yadda saxla&quot;-ya basın.
          </p>
        </form>
      </div>
    </div>
  );
}
