import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Flame, ArrowRight, Mail } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!r.ok) {
        const prefix = data.code ? `[${data.code}] ` : "";
        setError(
          `${prefix}${data.error || "Giriş uğursuz oldu (401 — e-poçt və ya şifrə yanlışdır)"}`,
        );
        return;
      }
      navigate('/admin', { replace: true });
    } catch {
      setError('Şəbəkə xətası');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-scope min-h-dvh bg-gradient-to-br from-orange-50 via-white to-orange-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-200/40 border border-orange-100 p-8 sm:p-10">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl shadow-lg">
              <Flame className="w-8 h-8" aria-hidden />
            </div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight text-center">
              Flame Sushi — Admin
            </h1>
            <p className="text-sm text-neutral-500 text-center">
              E-poçt və şifrə ilə daxil olun
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2"
              >
                E-poçt
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300"
                  aria-hidden
                />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral-100 bg-neutral-50/80 focus:border-primary focus:ring-0 outline-none transition text-neutral-900 font-medium placeholder:text-neutral-300"
                  placeholder="admin@flamesushi.az"
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2"
              >
                Şifrə
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300"
                  aria-hidden
                />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral-100 bg-neutral-50/80 focus:border-primary focus:ring-0 outline-none transition text-neutral-900 font-medium placeholder:text-neutral-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600 font-medium bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? 'Giriş…' : 'Daxil ol'}
              <ArrowRight className="w-5 h-5" aria-hidden />
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-neutral-400">
          <Link to="/" className="text-primary font-bold hover:underline">
            ← Sayta qayıt
          </Link>
        </p>
      </div>
    </div>
  );
}
