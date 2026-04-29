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
- **Application root:** Repozitoriyanın yerləşdiyi qovluq — **tam olaraq `package.json` və `server.js` faylının olduğu qovluq** (aşağıdakı “Qovluq quruluşu” bölməsinə baxın).
- **Application startup file:** **`server.js`**
  - Kök `server.js` yalnız girişdir; əsas məntiq `dist-server/` içindədir.
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

### Hostingerdə `public_html` və `nodejs` — niyə köhnə saytınız üçün problem olmayıb?

Hostinger tərəfindən bu iki şey qarışdıqda ən çox xətalar çıxır:

| Düzgün model (bir çox işləyən qurulum) | Əksər hallarda qarışıqlığa yol verən qurulum |
|---------------------------------------|--------------------------------------------|
| **Node üçün** panel çox vaxt `public_html` **yanında** ayrıca bir **`nodejs`** (və ya paneldə adı yazılmış) Node tətbiq qovluğu yaradır; məs.: `home/user/nodejs/...` — tətbiq ora yüklənir və ya ora deploy olunur. | Faylları **`public_html` içində** çox səviyyəli klasör strukturunda saxlamaq və **Application root** kimi layihənin **həqiqi kökünü** (`package.json` olan yer) seçməmək. |

**Layihənin işləməsi üçün ən vacibi:** Node paneldə **Application root** — **dəqiq layihənin kök qovşağıdır** (içində `package.json`, `server.js`). O, **`public_html` altında 2–3 səviyyə için-içdə** məcburi deyildir; çox vaxt **əksinə**, Node dəstəyi göstərdiyi **ayrı qovluq** (əmələ gəlmiş `nodejs` və s.) daha düzgündür.

Sizin gördüyünüz “`public_html` içində növbəti klasör içində yenə klasör” ssenarisində ən çox zaman **root səhv seçilib** və ya kod **əvvəl doğru olduğu kimi `nodejs` yerinə `public_html` altına yerləşdirilib**. Həmişə **`package.json`-ın olduğu qovluğu** Root kimi seçin; GitHub deployments Hostinger tərəfindən adətən həmin `nodejs`/təyin olunmuş yerə düşür.

### Köhnə üsul (ZIP ilə yükləmə)

Əvvəlki kimi Fayl Meneceri ilə yükləyəndə də sıra eynidir: yükləmə → **`npm install`** → **`npm run build`** → tətbiqi işə sal.
