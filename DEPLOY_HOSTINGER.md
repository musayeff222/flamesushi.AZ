# Hostinger Node.js — GitHub üzərindən qurulum

İki əsas fayl var:

| Fayl | Rol |
|------|-----|
| **`server.js`** (layihə kökündə) | Hostinger də «Application Startup File» kimi adətən **`server.js`** gözləyir — bu nöqtədə giriş faylıdır və `dist-server/server.js`-i yükləyir. |
| **`dist-server/server.js`** | `server.ts`-dən `npm run build` ilə yaranır; repoda saxlanmir ( `.gitignore` ). |

Ümumi xəta: paneldə `server.ts` və ya ən köhnə konfiq seçilib — **kökdə olan `server.js`** və ya ən sonda yazılan **`npm start`** istifadə edin.

### 1. GitHub-da (və ya lokaldə) build əmrləri

```bash
npm install
npm run build
```

Bu addımla **`dist/`** (Vite SPA) və **`dist-server/`** (compile olunmuş backend) yaradılır.

### 2. Hostinger Node.js panel

- **Node.js versiyası:** 20 və ya daha yeni.
- **Application root:** Repozitoriyanın yerləşdiyi qovluq (növbəti nöqtədə `package.json`-ın olduğu yer).
- **Application startup file:** **`server.js`**
  - Kökdə olan **boş shim yoxdur** — `server.js` real girişdir; əsas məntiq `dist-server/` içindədir.
- Əgər panel ayrıca **Build komandası** verirsə məsələn Git deploy üçün:
  - **Install:** `npm install`
  - **Build:** `npm run build`
  - **Start:** `npm start` (startup faylı yenə **`server.js`** seçilə bilər; **`npm start`** `NODE_ENV=production` ilə işlədir.)

### 3. Mühiti təyin etmək

Layihənin production rejimində olduğundan əmin olun (statiklər `dist/`-dən gedir):

- **Variant A:** Paneldə **Environment Variable:** `NODE_ENV` = `production`
- **Variant B:** Yalnız **`npm start`** işlədin (skriptdə `cross-env NODE_ENV=production` var.)

### 4. Port

Hostinger `process.env.PORT` verir. Kod `PORT`-u rəqəm kimi oxuyur; əlavə konfiq tələb etməyə bilər.

### 5. `npm install --omit=dev` xəbərdarlığı

Əgər hosting yalnız **production** asılılıqları quraşdırırsa, **`vite build`** və **`tsc`** işləməz (onlar çox vaxt `devDependencies`-də olur).

Həlli: **Layihədə `npm install` (tam)** ilə build etmək**, və ya VPS/panel parametrlərində `--omit=dev` olmasın.**

### Köhnə üsul (ZIP ilə yükləmə)

Əvvəlki kimi Fayl Meneceri ilə yükləyəndə də sıra eynidir: yükləmə → **`npm install`** → **`npm run build`** → tətbiqi işə sal.
