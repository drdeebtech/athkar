# أذكار

موقع عربي يساعد المسلم على قراءة الذكر المناسب لكل موقف بسهولة: أذكار الصباح والمساء والنوم والصلاة والسفر وغيرها من مواقف اليوم، مع عدّاد للتسبيح وخيارات قراءة مريحة.

## المزايا

- 345 ذكرًا ودعاءً من «حصن المسلم» موزعة على 135 موقفًا في 12 قسمًا.
- عدّاد لكل ذكر، وشريط إتمام، وانتقال تلقائي إلى الذكر التالي.
- بحث لا يتأثر بالتشكيل أو الهمزات.
- إعدادات قراءة: حجم الخط، الخط العريض، إخفاء التشكيل، الوضع الليلي.
- نسخ ومشاركة كل ذكر (واتساب أو قائمة المشاركة في الجوال).
- صفحات مولّدة مسبقًا وسريعة، مع خريطة موقع لمحركات البحث.

## التشغيل محليًا

يتطلب Node.js 24 أو أحدث.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # اختبارات الوحدة
npm run check      # فحص الكود + الأنواع + الاختبارات + البناء
```

## متغيرات البيئة

| المتغير | الوصف |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | رابط الموقع (الافتراضي https://athkar.site) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | معرّف AdSense، والإعلانات معطلة بدونه |
| `NEXT_PUBLIC_ADSENSE_SLOT` | معرّف وحدة الإعلان |

## سجلات بناء Cloudflare

لقراءة سجل آخر بناء من الطرفية:

```bash
npm run logs:build                  # آخر بناء
npm run logs:build -- --branch main # آخر بناء لفرع معيّن
npm run logs:build -- <build_uuid>  # بناء محدد
```

يحتاج السكربت مفتاح API بصلاحيات قراءة فقط، ولا يُحفظ المفتاح في المشروع أبدًا:

1. أنشئ مفتاحًا من https://dash.cloudflare.com/profile/api-tokens ← Create Token ← Custom token، بصلاحيتين على مستوى الحساب: `Workers Builds Configuration: Read` و `Workers Scripts: Read`.
2. احفظه في Keychain الماك (يطلب منك لصق المفتاح بشكل مخفي):

```bash
security add-generic-password -a "$USER" -s athkar-cloudflare-builds -w
```

أو مرّره كمتغير بيئة `CLOUDFLARE_BUILDS_API_TOKEN` في أي نظام آخر.

## مصدر المحتوى

النصوص من القرآن الكريم والسنة النبوية بترتيب كتاب «حصن المسلم» للشيخ سعيد بن علي بن وهف القحطاني، وقاعدة البيانات من مشروع [azkar-db](https://github.com/osamayy/azkar-db). الملف الأصلي محفوظ في `data/sources/azkar-db.json`.

## البنية

```
data/sources/          بيانات الأذكار الأصلية
src/lib/athkar/        منطق البيانات والبحث والعدّاد (مع الاختبارات)
src/components/athkar/ مكونات الواجهة
src/app/               الصفحات: الرئيسية، /athkar/[id]، /sources
```

مبني على قالب [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) (رخصة MIT).
