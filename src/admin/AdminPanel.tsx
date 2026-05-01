import {
  Fragment,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  GripVertical,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Plus,
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
import { AdminLocalImageInput } from './AdminLocalImageInput.tsx';
import {
  cloneCatalogJson,
  useDebouncedAdminCatalogPersist,
} from './catalogPersist.tsx';

type Tab =
  | 'overview'
  | 'banners'
  | 'categories'
  | 'products'
  | 'promos'
  | 'site'
  | 'security';

const ADMIN_THEME_KEY = 'flamesushi_admin_theme_dark';

const NAV_ITEMS = [
  { id: 'overview' as const, label: 'İdarə paneli', Icon: LayoutDashboard },
  { id: 'banners' as const, label: 'Banerlər', Icon: Images },
  { id: 'categories' as const, label: 'Məhsul qrupları', Icon: Tags },
  { id: 'products' as const, label: 'Məhsullar', Icon: Package },
  { id: 'promos' as const, label: 'Promo kodlar', Icon: TicketPercent },
  { id: 'site' as const, label: 'Sayt, tema', Icon: Settings2 },
  {
    id: 'security' as const,
    label: 'Şifrə və təhlükəsizlik',
    Icon: KeyRound,
  },
] as const;

function slugIdFromName(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48);
  return raw || `qrup-${Date.now()}`;
}

function reorderProductSortInGroup(
  products: Product[],
  groupIdsOrdered: string[],
): Product[] {
  const set = new Set(groupIdsOrdered);
  const next: Product[] = [];
  for (let i = 0; i < groupIdsOrdered.length; i++) {
    const id = groupIdsOrdered[i]!;
    const p = products.find((x) => x.id === id);
    if (!p) continue;
    next.push({ ...p, sortOrder: i * 10 });
  }
  return products.map((p) => {
    if (!set.has(p.id)) return p;
    const hit = next.find((x) => x.id === p.id);
    return hit ?? p;
  });
}

function SortableProductMobileAdminCard({
  product: p,
  categoryLabel,
  dark,
  onEdit,
  onDelete,
}: {
  product: Product;
  categoryLabel: string;
  dark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 rounded-2xl border p-4 ${
        dark
          ? 'border-neutral-800 bg-neutral-900/90'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <button
        type="button"
        className={
          dark
            ? 'shrink-0 self-center rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            : 'shrink-0 self-center rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
        }
        aria-label="Sürüşdür"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-6 w-6" />
      </button>
      <div className="flex min-w-0 flex-1 gap-3">
        {p.image.trim() ?
          <img
            src={p.image}
            alt=""
            className={`h-20 w-20 shrink-0 rounded-xl object-cover ${
              dark ? 'bg-neutral-800' : 'bg-neutral-100'
            }`}
            referrerPolicy="no-referrer"
          />
        : <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-[9px] font-bold leading-tight ${
              dark ?
                'border border-dashed border-neutral-600 text-neutral-500'
              : 'border border-dashed border-neutral-300 text-neutral-400'
            }`}
          >
            Şəkil yox
          </div>
        }
        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-black ${
              dark ? 'text-neutral-100' : 'text-neutral-900'
            }`}
          >
            {p.name}
          </div>
          <div className="truncate text-xs text-neutral-500">{categoryLabel}</div>
          <div className="mt-1 font-black text-primary">
            {(p.discountPrice ?? p.price).toFixed(2)} ₼
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            className={`touch-manipulation rounded-xl p-2 ${
              dark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100 text-neutral-800'
            }`}
            aria-label="Redaktə"
            onClick={onEdit}
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`touch-manipulation rounded-xl bg-red-500/15 p-2 ${
              dark ? 'text-red-300' : 'text-red-600'
            }`}
            aria-label="Sil"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableProductTableRowAdmin({
  product: p,
  categoryLabel,
  dark,
  onEdit,
  onDelete,
}: {
  product: Product;
  categoryLabel: string;
  dark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : undefined,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t ${dark ? 'border-neutral-800' : 'border-neutral-100'}`}
    >
      <td className="px-2 py-2 align-middle">
        <button
          type="button"
          className={
            dark ?
              'rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            : 'rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
          }
          aria-label="Sürüşdür"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </td>
      <td className="px-4 py-2">
        {p.image.trim() ?
          <img
            src={p.image}
            alt=""
            className={`h-12 w-12 rounded-lg object-cover ${
              dark ? 'bg-neutral-800' : 'bg-neutral-100'
            }`}
            referrerPolicy="no-referrer"
          />
        : <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg text-[8px] font-bold ${
              dark ?
                'border border-dashed border-neutral-600 text-neutral-500'
              : 'border border-dashed border-neutral-300 text-neutral-400'
            }`}
          >
            —
          </div>
        }
      </td>
      <td className={`px-4 py-2 font-semibold max-w-[220px] ${dark ? 'text-neutral-100' : ''}`}>
        <span className="line-clamp-2">{p.name}</span>
        {p.popular ?
          <span className="ml-2 text-[10px] font-black uppercase text-primary">
            populyar
          </span>
        : null}
      </td>
      <td className={`px-4 py-2 ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>
        {categoryLabel}
      </td>
      <td className="px-4 py-2 font-black text-primary">
        {(p.discountPrice ?? p.price).toFixed(2)} ₼
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <button
          type="button"
          className={`mr-2 inline-flex touch-manipulation items-center gap-2 rounded-xl px-3 py-2 font-bold ${
            dark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100 text-neutral-800'
          }`}
          onClick={onEdit}
        >
          <PencilLine className="h-4 w-4" /> Redaktə
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 font-bold text-red-700"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" /> Sil
        </button>
      </td>
    </tr>
  );
}

async function fetchAdminMe(): Promise<{
  authenticated: boolean;
  email: string | null;
  reason?:
    | 'mysql_not_configured'
    | 'session_not_configurable';
}> {
  const r = await fetch('/api/admin/me', { credentials: 'include' });
  const j = (await r.json()) as {
    authenticated?: boolean;
    email?: string | null;
    reason?:
      | 'mysql_not_configured'
      | 'session_not_configurable';
  };
  return {
    authenticated: Boolean(j.authenticated),
    email: typeof j.email === 'string' ? j.email : null,
    ...(j.reason ? { reason: j.reason } : {}),
  };
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalog, reload } = useCatalog();

  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState<CatalogState>(() =>
    cloneCatalogJson(defaultCatalogState),
  );
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_THEME_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [catSearch, setCatSearch] = useState('');
  const [categoryModal, setCategoryModal] = useState<
    null | { mode: 'add' } | { mode: 'edit'; category: Category }
  >(null);
  const [categoryDraftName, setCategoryDraftName] = useState('');

  const [compactUi, setCompactUi] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 639px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const fn = () => setCompactUi(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (
      t === 'overview'
      || t === 'banners'
      || t === 'categories'
      || t === 'products'
      || t === 'promos'
      || t === 'site'
      || t === 'security'
    )
      setTab(t);
    if (searchParams.has('tab')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot query cleanup
  }, []);

  useEffect(() => {
    if (!categoryModal) {
      setCategoryDraftName('');
      return;
    }
    if (categoryModal.mode === 'edit')
      setCategoryDraftName(categoryModal.category.name);
    else setCategoryDraftName('');
  }, [categoryModal]);

  useDebouncedAdminCatalogPersist(draft, catalog);

  useEffect(() => {
    void (async () => {
      const auth = await fetchAdminMe();
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
      setAdminEmail(auth.email ?? null);
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
    setDraft(cloneCatalogJson(catalog));
  }, [catalog]);

  const logout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    navigate(ADMIN_ROUTES.login, { replace: true });
  }, [navigate]);

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

  const productSortIds = useMemo(
    () => sortedFilteredProducts.map((p) => p.id),
    [sortedFilteredProducts],
  );

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return draft.categories;
    return draft.categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [draft.categories, catSearch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onProductDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = productSortIds;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const nextOrder = arrayMove(
        ids.slice(),
        oldIndex,
        newIndex,
      ) as string[];
      setDraft((prev) => ({
        ...prev,
        products: reorderProductSortInGroup(prev.products, nextOrder),
      }));
    },
    [productSortIds],
  );

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
      image: '',
      popular: false,
      sortOrder: 500,
      availabilityNote: '',
      extraNote: '',
      discountMode: 'none',
      discountPercent: undefined,
      discountFixedAmount: undefined,
      orderWindow: {
        enabled: false,
        start: '09:30',
        end: '23:59',
        hideOutsideWindow: false,
      },
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

  const currentSectionLabel =
    NAV_ITEMS.find((n) => n.id === tab)?.label ?? 'Admin';

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
        className={`fixed inset-y-0 left-0 z-40 flex max-h-[100dvh] w-[min(18rem,100vw)] max-w-[min(17rem,100%)] flex-col border-r transition-transform duration-200 lg:static lg:w-auto lg:max-w-[17rem] lg:translate-x-0 ${
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
          {NAV_ITEMS.map(({ id, label, Icon }) => (
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
        {adminEmail ? (
          <div
            className={`truncate px-3 pb-2 text-[11px] font-semibold opacity-75 ${
              dark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
            title={adminEmail}
          >
            {adminEmail}
          </div>
        ) : null}
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
          className={`sticky top-0 z-20 flex flex-col gap-1 border-b px-3 py-2 backdrop-blur backdrop-saturate-150 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3 ${
            dark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white/95'
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={`inline-flex touch-manipulation rounded-xl p-2 font-bold lg:hidden ${
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
              <span
                className={`hidden min-w-0 truncate text-[11px] font-black sm:inline md:max-w-[200px] lg:max-w-xs ${
                  dark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
                title={currentSectionLabel}
              >
                · {currentSectionLabel}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void logout()}
                className={`inline-flex touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold sm:px-4 sm:text-sm ${
                  dark
                    ? 'border border-neutral-700 bg-neutral-900'
                    : 'border border-neutral-200 bg-white'
                }`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Çıxış</span>
              </button>
            </div>
          </div>
          <p
            className={`truncate pb-1 text-center text-[11px] font-black sm:hidden sm:pb-0 ${
              dark ? 'text-neutral-400' : 'text-neutral-600'
            }`}
          >
            {currentSectionLabel}
          </p>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:px-6 sm:pb-24">
        {tab === 'overview' && (
          <section className="space-y-6">
            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                dark
                  ? 'border-neutral-800 bg-neutral-900/90'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest opacity-55">
                Flame Sushi · admin
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">İdarə paneli</h1>
              <p className="mt-2 max-w-xl text-sm opacity-85">
                Dəyişikliklər avtomatik olaraq arxa planda serverə yazılır; xüsusi «yadda saxla»
                düyməsi yoxdur.
              </p>
              {adminEmail ? (
                <p className={`mt-3 text-sm ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  Giriş: <span className="font-bold">{adminEmail}</span>
                </p>
              ) : (
                <p className={`mt-3 text-sm ${dark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                  Köhnə kuki ilə giriş edilib — şifrə dəyişmək üçün çıxıb yenidən daxil olun.
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Məhsullar',
                  val: draft.products.length,
                  hint: 'Kataloqda mövqe',
                  Icon: Package,
                  tabId: 'products' as const,
                },
                {
                  title: 'Kateqoriyalar',
                  val: draft.categories.length,
                  hint: 'Məhsul qrupları',
                  Icon: Tags,
                  tabId: 'categories' as const,
                },
                {
                  title: 'Promo kodlar',
                  val: (draft.promoCodes ?? []).length,
                  hint: 'Aktiv aksiyalar',
                  Icon: TicketPercent,
                  tabId: 'promos' as const,
                },
                {
                  title: 'Banerlər',
                  val: draft.siteBanners?.slides?.length ?? 0,
                  hint: 'Karusel slaytları',
                  Icon: Images,
                  tabId: 'banners' as const,
                },
              ].map(({ title, val, hint, Icon: Ico, tabId }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setTab(tabId)}
                  className={`touch-manipulation rounded-2xl border p-4 text-left shadow-sm transition hover:brightness-[1.02] ${
                    dark
                      ? 'border-neutral-800 bg-neutral-900/85 hover:border-neutral-700'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-55">
                        {title}
                      </p>
                      <p className="mt-2 text-3xl font-black tabular-nums">{val}</p>
                      <p className={`mt-1 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        {hint}
                      </p>
                    </div>
                    <Ico
                      className={`h-8 w-8 shrink-0 opacity-35 ${
                        dark ? 'text-primary' : 'text-primary'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTab('security')}
                className={`rounded-2xl border p-5 text-left ${
                  dark
                    ? 'border-neutral-800 bg-neutral-950/60'
                    : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <KeyRound className="mb-2 h-6 w-6 text-primary" />
                <p className="font-black">Şifrəni yeniləyin</p>
                <p className="mt-1 text-sm opacity-80">
                  Hesab üçün cari şifrədən çıxaraq yenisini təyin edin — yalnız sizdə olan girişi
                  bağlayır.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTab('site')}
                className={`rounded-2xl border p-5 text-left ${
                  dark
                    ? 'border-neutral-800 bg-neutral-900/80'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <Settings2 className="mb-2 h-6 w-6 text-primary" />
                <p className="font-black">Sayt, tema, əlaqə</p>
                <p className="mt-1 text-sm opacity-80">
                  Haqqımızda mətni, WhatsApp, iş saatları və sayt üçün 3 tema variantı burada
                  tənzimlənir.
                </p>
              </button>
            </div>
          </section>
        )}

        {tab === 'security' && (
          <AdminSecurityTab dark={dark} adminEmail={adminEmail} />
        )}

        {tab === 'banners' && (
          <AdminBannersTab draft={draft} setDraft={setDraft} dark={dark} />
        )}
        {tab === 'promos' && (
          <AdminPromosTab draft={draft} setDraft={setDraft} dark={dark} />
        )}
        {tab === 'products' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onProductDragEnd}
          >
            <SortableContext
              items={productSortIds}
              strategy={
                compactUi ? rectSortingStrategy : verticalListSortingStrategy
              }
            >
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Axtarış (ad, təsvir)…"
                        className={`w-full pl-10 pr-3 py-3 rounded-2xl border text-sm font-medium ${
                          dark
                            ? 'border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600'
                            : 'border-neutral-200 bg-white text-neutral-900'
                        }`}
                      />
                    </div>
                    <select
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      className={`w-full sm:w-56 py-3 px-3 rounded-2xl border text-sm font-bold ${
                        dark
                          ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                          : 'border-neutral-200 bg-white text-neutral-900'
                      }`}
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
                    className={`inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                      dark
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'bg-neutral-900 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Yeni məhsul
                  </button>
                </div>

                <p className={`text-xs font-bold ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Sıralama: solundakı ikonu tutub sürüşdürün — yalnız cari filtirdə görünən
                  məhsulların sırası yenilənir.
                </p>

                {compactUi ?
                  <div className="grid gap-3">
                    {sortedFilteredProducts.map((p) => (
                      <Fragment key={p.id}>
                        <SortableProductMobileAdminCard
                          product={p}
                          categoryLabel={
                            draft.categories.find((c) => c.id === p.category)
                              ?.name ?? p.category
                          }
                          dark={dark}
                          onEdit={() => {
                            setIsNewProduct(false);
                            setProductModal({ ...p });
                          }}
                          onDelete={() => deleteProduct(p.id)}
                        />
                      </Fragment>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="py-10 text-center text-neutral-500">
                        Bu filtrdə məhsul yoxdur.
                      </p>
                    )}
                  </div>
                : <div
                    className={`overflow-x-auto rounded-2xl border ${
                      dark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <table className="min-w-full text-sm">
                      <thead
                        className={`text-left text-[11px] uppercase tracking-wide text-neutral-500 ${
                          dark ? 'bg-neutral-900/80' : 'bg-neutral-50'
                        }`}
                      >
                        <tr>
                          <th className="w-10 px-2 py-3" aria-label="Sıra" />
                          <th className="px-4 py-3">Şəkil</th>
                          <th className="px-4 py-3">Ad</th>
                          <th className="px-4 py-3">Kateqoriya</th>
                          <th className="px-4 py-3">Qiymət</th>
                          <th className="px-4 py-3 text-right">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFilteredProducts.map((p) => (
                          <Fragment key={p.id}>
                            <SortableProductTableRowAdmin
                              product={p}
                              categoryLabel={
                                draft.categories.find((c) => c.id === p.category)
                                  ?.name ?? p.category
                              }
                              dark={dark}
                              onEdit={() => {
                                setIsNewProduct(false);
                                setProductModal({ ...p });
                              }}
                              onDelete={() => deleteProduct(p.id)}
                            />
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
                {!compactUi && filteredProducts.length === 0 && (
                  <p className="py-10 text-center text-neutral-500">
                    Bu filtrdə məhsul yoxdur.
                  </p>
                )}
              </section>
            </SortableContext>
          </DndContext>
        )}

        {tab === 'categories' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Qrup adı və ya ID üzrə axtar…"
                  className={`w-full rounded-2xl border py-3 pl-10 pr-3 text-sm font-medium ${
                    dark
                      ? 'border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600'
                      : 'border-neutral-200 bg-white text-neutral-900'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => setCategoryModal({ mode: 'add' })}
                className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Qrup əlavə et
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCategories.map((c) => (
                <div
                  key={c.id}
                  className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-start ${
                    dark
                      ? 'border-neutral-800 bg-neutral-900/90'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1 sm:max-w-[200px]">
                    <AdminLocalImageInput
                      variant="row"
                      dark={dark}
                      label="Qrup şəkli"
                      hint="Yalnız cihazdan (qalereya)."
                      value={c.image}
                      onChange={(url) => upsertCategory({ ...c, image: url })}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase text-neutral-400">
                      ID: {c.id}
                    </div>
                    <div
                      className={`font-black text-lg ${dark ? 'text-neutral-50' : 'text-neutral-900'}`}
                    >
                      {c.name}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`touch-manipulation rounded-xl px-3 py-2 text-sm font-bold ${
                          dark ?
                            'bg-neutral-800 text-neutral-100'
                          : 'bg-neutral-100 text-neutral-800'
                        }`}
                        onClick={() =>
                          setCategoryModal({ mode: 'edit', category: c })
                        }
                      >
                        Düzənlə
                      </button>
                      <button
                        type="button"
                        className={`rounded-xl px-3 py-2 text-sm font-bold ${
                          dark ?
                            'bg-red-950/60 text-red-300'
                          : 'bg-red-50 text-red-700'
                        }`}
                        onClick={() => deleteCategory(c.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredCategories.length === 0 && (
              <p className="py-12 text-center text-sm text-neutral-500">
                Axtarışa uyğun qrup yoxdur.
              </p>
            )}
          </section>
        )}

        {tab === 'site' && (
          <section
            className={`max-w-2xl space-y-6 rounded-3xl border p-6 ${
              dark
                ? 'border-neutral-800 bg-neutral-900/90'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <div>
              <label
                className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                  dark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                Mağaza teması (3 fərqli görünüş)
              </label>
              <p
                className={`mb-4 text-sm leading-relaxed ${
                  dark ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                Birini seçin — təxminən yarım saniyə sonra avtomatik saxlanır və
                mağaza səhifəsi yenilənəndə dərhal tətbiq olunur. Fərqi dərhal
                görmək üçün aşağıdakı linklərdən birini yeni vərəqdə açın.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'flame' as const, lab: 'Flame' },
                    { id: 'sakura' as const, lab: 'Sakura' },
                    { id: 'ocean' as const, lab: 'Ocean' },
                  ] as const
                ).map((t) => (
                  <a
                    key={t.id}
                    href={`/?previewTheme=${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                      dark ?
                        'border-neutral-600 bg-neutral-950 text-neutral-200 hover:border-primary hover:text-primary'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {t.lab} — tam ekran önizləmə
                  </a>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      id: 'flame' as const,
                      lab: 'Flame',
                      sub: '#FF6B35',
                      desc: 'İsti alov, yumru künc, Inter mətn',
                    },
                    {
                      id: 'sakura' as const,
                      lab: 'Sakura',
                      sub: '#db2777',
                      desc: 'Pastel çəhrayı, Fraunces başlıq, yumşaq kölgə',
                    },
                    {
                      id: 'ocean' as const,
                      lab: 'Ocean',
                      sub: '#0ea5e9',
                      desc: 'Künclər kəskin, qəzet blok-kölgə, Outfit',
                    },
                  ] as const
                ).map((t) => {
                  const active =
                    (draft.siteSettings?.themeId ?? 'flame') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          siteSettings: {
                            ...(d.siteSettings ?? {}),
                            themeId: t.id,
                          },
                        }))
                      }
                      className={`touch-manipulation rounded-2xl border-2 p-3 text-left transition ${
                        active ?
                          dark ?
                            'border-primary bg-neutral-950 ring-2 ring-primary/35'
                          : 'border-primary bg-primary/5 ring-2 ring-primary/25'
                        : dark ?
                          'border-neutral-700 bg-neutral-950 hover:border-neutral-600'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
                      }`}
                    >
                      <div
                        className="relative mb-2 h-16 w-full overflow-hidden rounded-xl border border-black/10 shadow-inner"
                        style={{
                          background: `linear-gradient(145deg,${t.sub} 0%,${t.sub}aa 42%,rgba(255,255,255,0.35)100%)`,
                        }}
                      >
                        <span className="absolute bottom-1.5 left-2 text-[10px] font-black uppercase text-white drop-shadow-md">
                          {active ? '● Aktiv mağaza' : 'Seç'}
                        </span>
                      </div>
                      <p className="text-base font-black">{t.lab}</p>
                      <p
                        className={`mt-1 text-xs leading-snug ${
                          dark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {t.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p
                className={`mt-3 text-[11px] font-medium leading-relaxed ${
                  dark ? 'text-neutral-500' : 'text-neutral-500'
                }`}
              >
                Qeyd: yalnız ünvan sətirində <code>?previewTheme=...</code>{' '}
                olduqda baxış parametri seçilmiş kimi göstərir — adi ziyarətdə
                serverdə saxlanmış tema keçərlidir.
              </p>
            </div>

            <div>
              <label
                className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                  dark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                Haqqımızda
              </label>
              <textarea
                rows={5}
                className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium leading-relaxed ${
                  dark
                    ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
                placeholder="Şirkət və xidmət haqqında mətn…"
                value={draft.siteSettings?.aboutText ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteSettings: {
                      ...(d.siteSettings ?? {}),
                      aboutText: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div>
              <label
                className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                  dark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                Əlaqə nömrəsi (göstəriş)
              </label>
              <input
                className={`w-full rounded-2xl border px-4 py-3 font-bold ${
                  dark
                    ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
                placeholder="+994 55 533 88 98"
                value={draft.siteSettings?.contactPhone ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteSettings: {
                      ...(d.siteSettings ?? {}),
                      contactPhone: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div>
              <label
                className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                  dark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                WhatsApp (yalnız rəqəm)
              </label>
              <input
                className={`w-full rounded-2xl border px-4 py-3 font-bold ${
                  dark
                    ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
                value={draft.whatsapp}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    whatsapp: e.target.value.replace(/[^\d+]/g, ''),
                  }))
                }
                inputMode="numeric"
              />
              <p className={`mt-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Sifariş mesajları bu nömrəyə yönləndirilir.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                    dark ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  Açılış
                </label>
                <input
                  className={`w-full rounded-2xl border px-4 py-3 font-bold ${
                    dark
                      ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                      : 'border-neutral-200 bg-white text-neutral-900'
                  }`}
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
                <label
                  className={`mb-2 block text-xs font-black uppercase tracking-widest ${
                    dark ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  Bağlanış
                </label>
                <input
                  className={`w-full rounded-2xl border px-4 py-3 font-bold ${
                    dark
                      ? 'border-neutral-700 bg-neutral-950 text-neutral-100'
                      : 'border-neutral-200 bg-white text-neutral-900'
                  }`}
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

      {categoryModal ?
        <div className="fixed inset-0 z-50 flex touch-manipulation items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            className={`max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${
              dark ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'
            }`}
          >
            <h2 className="text-lg font-black">
              {categoryModal.mode === 'add' ? 'Yeni qrup' : 'Qrupu düzənlə'}
            </h2>
            <label
              className={`mt-4 block text-[11px] font-black uppercase ${
                dark ? 'text-neutral-500' : 'text-neutral-500'
              }`}
            >
              Qrup adı
            </label>
            <input
              autoFocus
              value={categoryDraftName}
              onChange={(e) => setCategoryDraftName(e.target.value)}
              className={
                dark
                  ? 'mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-base font-bold'
                  : 'mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-bold'
              }
              placeholder="Məs.: Premium setlər"
            />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={
                  dark
                    ? 'rounded-xl border border-neutral-700 px-5 py-3 text-sm font-bold'
                    : 'rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold'
                }
                onClick={() => {
                  setCategoryModal(null);
                  setCategoryDraftName('');
                }}
              >
                Ləğv et
              </button>
              <button
                type="button"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20"
                onClick={() => {
                  const name = categoryDraftName.trim();
                  if (!name) return;
                  if (categoryModal.mode === 'add') {
                    const id = slugIdFromName(name);
                    if (draft.categories.some((c) => c.id === id)) {
                      alert('Bu addan və ya ID-dən qrup artıq var — adı bir az dəyişin.');
                      return;
                    }
                    upsertCategory({ id, name, image: '' });
                  } else {
                    upsertCategory({
                      ...categoryModal.category,
                      name,
                    });
                  }
                  setCategoryModal(null);
                  setCategoryDraftName('');
                }}
              >
                {categoryModal.mode === 'add' ? 'Əlavə et' : 'Yenilə'}
              </button>
            </div>
          </div>
        </div>
      : null}

      {productModal ?
        <ProductModal
          product={productModal}
          categories={draft.categories}
          dark={dark}
          isNew={isNewProduct}
          onClose={() => setProductModal(null)}
          onSave={(p) => upsertProduct(p)}
        />
      : null}
    </div>
  );
}

function AdminSecurityTab({
  dark,
  adminEmail,
}: {
  dark: boolean;
  adminEmail: string | null;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      alert('Şifrələri daxil edin');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Yeni şifrə təkrarı uyğun gəlmir');
      return;
    }
    if (newPassword.length < 8) {
      alert('Yeni şifrə ən azı 8 simvol olmalıdır');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        alert(j.error || 'Dəyişiklik baş tutmadı');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Şifrə yeniləndi.');
    } catch {
      alert('Şəbəkə xətası');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = `w-full rounded-2xl border px-4 py-3 font-bold outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-primary ${
    dark
      ? 'border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600'
      : 'border-neutral-200 bg-white text-neutral-900'
  }`;

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-black">Şifrə və təhlükəsizlik</h2>
        <p className={`mt-1 text-sm ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Cari sessiyanız üçün yeni şifrə təyin edilir (<code>{adminEmail ?? '…'}</code>). Hash
          MySQL-da saxlanılır.
        </p>
      </div>
      {!adminEmail ? (
        <div
          className={`rounded-2xl border p-4 text-sm leading-relaxed ${
            dark
              ? 'border-amber-900/60 bg-amber-950/40 text-amber-100'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          Köhnə kuki növündə sessiya var — məhdudiyyət qaldırmaq üçün çıxış edib yenidən daxil olun.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className={`rounded-2xl border p-6 space-y-5 ${
            dark ? 'border-neutral-800 bg-neutral-900/85' : 'border-neutral-200 bg-white shadow-sm'
          }`}
        >
          <label className="block">
            <span
              className={`mb-2 block text-xs font-black uppercase tracking-wider ${
                dark ? 'text-neutral-500' : 'text-neutral-500'
              }`}
            >
              Cari şifrə
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span
              className={`mb-2 block text-xs font-black uppercase tracking-wider ${
                dark ? 'text-neutral-500' : 'text-neutral-500'
              }`}
            >
              Yeni şifrə (ən azı 8 simvol)
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span
              className={`mb-2 block text-xs font-black uppercase tracking-wider ${
                dark ? 'text-neutral-500' : 'text-neutral-500'
              }`}
            >
              Yeni şifrənin təkrarı
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full touch-manipulation rounded-2xl bg-primary px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/25 disabled:opacity-60"
          >
            {busy ? 'Yenilənir…' : 'Şifrəni yenilə'}
          </button>
        </form>
      )}
    </section>
  );
}


function ProductModal({
  product,
  categories,
  dark,
  isNew,
  onClose,
  onSave,
}: {
  product: Product;
  categories: Category[];
  dark: boolean;
  isNew: boolean;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [draft, setDraft] = useState<Product>(() => ({ ...product }));

  useEffect(() => {
    setDraft({ ...product });
  }, [product]);

  const ink =
    dark
      ? 'w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base font-bold text-neutral-100 outline-none ring-primary/35 focus-visible:ring-2 sm:text-[15px] touch-manipulation'
      : 'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-bold text-neutral-900 outline-none ring-primary/25 focus-visible:ring-2 sm:text-[15px] touch-manipulation';
  const tac =
    dark
      ? 'w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base font-medium text-neutral-100 outline-none ring-primary/35 focus-visible:ring-2 min-h-[88px] sm:text-[15px] touch-manipulation'
      : 'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-medium text-neutral-900 outline-none ring-primary/25 focus-visible:ring-2 min-h-[88px] sm:text-[15px] touch-manipulation';

  function submit(e: FormEvent) {
    e.preventDefault();
    let price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) price = 0;

    let discountPrice = draft.discountPrice;
    if (discountPrice !== undefined) {
      const d = Number(discountPrice);
      discountPrice = Number.isFinite(d) && d >= 0 ? d : undefined;
    }
    if (!draft.name.trim()) {
      alert('Ad boş ola bilməz');
      return;
    }
    if (!draft.image.trim()) {
      alert('Şəkili cihazdan seçib yükləyin');
      return;
    }

    const dp =
      typeof discountPrice === 'number' &&
      Number.isFinite(discountPrice) &&
      discountPrice >= 0 &&
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

    const mode = draft.discountMode ?? 'none';
    let discountPercentField: number | undefined;
    let discountFixedField: number | undefined;
    if (mode === 'percent') {
      const p = Number(draft.discountPercent);
      if (Number.isFinite(p) && p > 0 && p <= 100)
        discountPercentField = Math.round(p);
    }
    if (mode === 'fixed') {
      const f = Number(draft.discountFixedAmount);
      if (Number.isFinite(f) && f > 0)
        discountFixedField = Math.min(999999, Math.round(f * 100) / 100);
    }

    const availabilityNote =
      draft.availabilityNote?.trim() ?
        draft.availabilityNote.trim().slice(0, 1600)
      : undefined;
    const extraNote =
      draft.extraNote?.trim() ?
        draft.extraNote.trim().slice(0, 1600)
      : undefined;

    const ow = draft.orderWindow;
    const orderWindow =
      ow?.enabled ?
        {
          enabled: true,
          start: (ow.start ?? '09:30').trim() || '09:30',
          end: (ow.end ?? '23:59').trim() || '23:59',
          hideOutsideWindow: Boolean(ow.hideOutsideWindow),
        }
      : { enabled: false };

    onSave({
      ...draft,
      price,
      discountPrice: dp,
      sortOrder,
      discountMode: mode === 'none' ? undefined : mode,
      discountPercent: discountPercentField,
      discountFixedAmount: discountFixedField,
      availabilityNote,
      extraNote,
      orderWindow,
    });
  }

  const lbl =
    dark ?
      'block text-[11px] font-black uppercase tracking-wide text-neutral-400'
    : 'block text-[11px] font-black uppercase tracking-wide text-neutral-500';

  return (
    <div className="fixed inset-0 z-40 flex touch-manipulation items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl shadow-2xl sm:rounded-3xl ${
          dark ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 ${
            dark ? 'border-neutral-800 bg-neutral-950/95' : 'border-neutral-100 bg-white/95'
          }`}
        >
          <h2 className="text-base font-black sm:text-lg">
            {isNew ? 'Yeni məhsul əlavə et' : 'Məhsulu redaktə et'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              dark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-100 text-neutral-900'
            }`}
          >
            Bağla
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6">
          {!isNew ?
            <>
              <label className={lbl}>Məhsul ID</label>
              <input
                className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none ${
                  dark
                    ? 'border-neutral-700 bg-neutral-900 text-neutral-300'
                    : 'border-neutral-200 bg-neutral-100 text-neutral-700'
                }`}
                value={draft.id}
                readOnly
                disabled
              />
            </>
          : null}

          <div>
            <label className={lbl}>Ad</label>
            <input
              className={ink}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Məs.: Philadelphia set"
              autoComplete="off"
              required
            />
          </div>

          <AdminLocalImageInput
            dark={dark}
            label="Şəkil"
            hint="Yalnız cihaz yaddaşından (internet ünvanı yazısı yoxdur)."
            value={draft.image}
            onChange={(url) => setDraft((d) => ({ ...d, image: url }))}
          />

          <div>
            <label className={lbl}>Kateqoriya</label>
            <select
              className={`${ink} ${dark ? '!bg-neutral-950' : '!bg-white'}`}
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
          </div>

          <div className="grid grid-cols-2 gap-3 gap-y-4">
            <div>
              <label className={lbl}>Əsas qiymət (₼)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                className={`${ink} font-black`}
                value={draft.price}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, price: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className={lbl}>Təklif qiyməti (₼)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                className={ink}
                placeholder="Boş = əsas qiymət"
                value={draft.discountPrice ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    discountPrice:
                      e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Endirim badge (köşədə nişan)</label>
            <select
              className={`${ink} ${dark ? '!bg-neutral-950' : '!bg-white'}`}
              value={draft.discountMode ?? 'none'}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  discountMode: e.target.value as Product['discountMode'],
                }))
              }
            >
              <option value="none">Göstərmə</option>
              <option value="percent">Faiz (%)</option>
              <option value="fixed">Sabit məbləğ (₼)</option>
            </select>
          </div>

          {(draft.discountMode ?? 'none') === 'percent' ?
            <div>
              <label className={lbl}>Endirim faizi (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                placeholder="15"
                className={ink}
                value={draft.discountPercent ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    discountPercent:
                      e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
          : null}

          {(draft.discountMode ?? 'none') === 'fixed' ?
            <div>
              <label className={lbl}>Sabit məbləğ nişanı (₼)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                className={ink}
                placeholder="Məs.: 5"
                value={draft.discountFixedAmount ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    discountFixedAmount:
                      e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          : null}

          <div>
            <label className={lbl}>Təsvir</label>
            <textarea
              className={tac}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Məzmun menyuda görünən təsvir"
            />
          </div>

          <div>
            <label className={lbl}>Əlavə qeyd sahəsi</label>
            <textarea
              className={`${tac.replace('min-h-[88px]', 'min-h-[64px]')}`}
              placeholder="Kiçik mətn blok (isti saxla, komponentlər və s.)"
              value={draft.extraNote ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, extraNote: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Sıra nömrəsi</label>
              <input
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="500"
                className={ink}
                value={draft.sortOrder ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sortOrder:
                      e.target.value === '' ?
                        undefined
                      : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex items-end pb-2">
              <label
                className={`flex cursor-pointer select-none items-center gap-3 text-sm font-bold ${
                  dark ? 'text-neutral-200' : 'text-neutral-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(draft.popular)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, popular: e.target.checked }))
                  }
                  className="h-5 w-5 rounded accent-primary"
                />
                Populyar
              </label>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              dark ? 'border-neutral-700 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <label
              className={`flex cursor-pointer select-none items-center justify-between gap-3 text-sm font-bold ${
                dark ? 'text-neutral-100' : 'text-neutral-800'
              }`}
            >
              <span>Məhdud sifariş vaxtı</span>
              <input
                type="checkbox"
                className="h-5 w-9 accent-primary"
                checked={Boolean(draft.orderWindow?.enabled)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    orderWindow: {
                      enabled: e.target.checked,
                      start: d.orderWindow?.start ?? '09:30',
                      end: d.orderWindow?.end ?? '23:59',
                      hideOutsideWindow:
                        d.orderWindow?.hideOutsideWindow ?? false,
                    },
                  }))
                }
              />
            </label>
            {draft.orderWindow?.enabled ?
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`${lbl} mb-1`}>Başlanğıc</label>
                    <input
                      type="time"
                      className={ink}
                      value={draft.orderWindow?.start ?? '09:30'}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          orderWindow: {
                            ...(d.orderWindow ?? {}),
                            enabled: true,
                            start: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={`${lbl} mb-1`}>Bitiş</label>
                    <input
                      type="time"
                      className={ink}
                      value={draft.orderWindow?.end ?? '23:59'}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          orderWindow: {
                            ...(d.orderWindow ?? {}),
                            enabled: true,
                            end: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <label
                  className={`flex cursor-pointer gap-3 text-xs font-bold leading-snug ${
                    dark ? 'text-neutral-300' : 'text-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    checked={Boolean(draft.orderWindow?.hideOutsideWindow)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        orderWindow: {
                          ...(d.orderWindow ?? { enabled: true }),
                          enabled: true,
                          hideOutsideWindow: e.target.checked,
                        },
                      }))
                    }
                  />
                  Saatdan kənarda menyuda gizlət (əz işarələsinizsə bloklanmış görünüş + mesaj)
                </label>
              </>
            : null}
          </div>

          <div>
            <label className={lbl}>Əlçatanlıq qeydi (dəstək / çatdırılma)</label>
            <textarea
              className={`${tac.replace('min-h-[88px]', 'min-h-[64px]')}`}
              placeholder="İstəyə bağlı"
              value={draft.availabilityNote ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, availabilityNote: e.target.value }))
              }
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white shadow-lg shadow-primary/25"
          >
            {isNew ? 'Məhsulu əlavə et' : 'Dəyişiklikləri tətbiq et'}
          </button>
        </form>
      </div>
    </div>
  );
}
