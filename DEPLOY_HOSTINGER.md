# Hostinger Node.js-də Bu Tətbiqin Yerləşdirilməsi (Deployment)

Flame Sushi tətbiqini Hostinger Node.js hostinqində işə salmaq üçün bu addımları izləyin:

### 1. Faylları Hazırlayın
Bütün kodu (lazım olmayan `node_modules` və `dist` qovluqları istisna olmaqla) ZIP formasına salın və Hostinger-in **File Manager** (Fayl Meneceri) vasitəsilə yükləyin.

### 2. Hostinger Panelində Node.js Setup
Hostinger panelində "Node.js" bölməsinə daxil olun və aşağıdakı ayarları edin:
- **Node.js Version:** 20 və ya daha yuxarı versiyanı seçin.
- **Application Root:** `/` (və ya kodu hansı qovluğa yükləmisinizsə ora).
- **Application URL:** Domen adınız.
- **Application Startup File:** `server.ts`

### 3. Asılılıqları Quraşdırın (Installing Dependencies)
Panelin içindəki **Terminal**-da və ya panelin düyməsi ilə bu əmri işə salın:
```bash
npm install
```

### 4. Tətbiqi Build Edin
Tətbiqin brauzerdə işləyən hissəsini hazırlamaq üçün bu əmri verin:
```bash
npm run build
```

### 5. Tətbiqi İşə Salın (Start)
Hostinger panelində "Start Table" və ya "Run" düyməsini sıxın. Əgər panel yoxdursa, terminalda:
```bash
npm start
```

### Əlavə Qeydlər:
- Tətbiq avtomatik olaraq `dist` qovluğundan statik faylları oxuyur.
- Port ayarı Hostinger tərəfindən idarə olunur, lakin server kodumuz `process.env.PORT` dəyərini avtomatik tanıyır.
- Əgər `tsx` tapılmasa, `npm install -g tsx` edə bilərsiniz, lakin tətbiq içində artıq quraşdırılıb.
