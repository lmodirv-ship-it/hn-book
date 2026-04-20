

## الخطة: إكمال ترقية "Glass Future" على باقي الموقع

لا، لم ننتهِ بعد. طبّقنا التصميم على Hero و ProductCard و Navbar و Footer و AdminLogin. باقي عناصر مهمة في الصفحة الرئيسية وباقي الصفحات.

### ما سيتم تحديثه

**1. الصفحة الرئيسية (Landing)**
- `HeroSection`: مراجعة الأزرار لاستخدام `.btn-driver-primary` و `.neon-ring`
- `FeaturesSection`: تحويل بطاقات المزايا إلى `.glass-future` مع `.icon-chip` ملوّنة (أزرق/سماوي/ذهبي/أخضر) لكل ميزة + تأثير `.holo-sheen` عند الـ hover
- `CategoryBar`: شرائط الفئات بستايل زجاجي مع توهج سماوي على النشط
- `BookRecommendations`: نفس بطاقات المنتجات الجديدة
- إضافة `FuturisticBackground` كخلفية للأقسام الرئيسية

**2. صفحات الكتالوج**
- `BooksPage` و `CategoryPage` و `TablouPage`: شبكة بطاقات بنفس ستايل ProductCard الجديد، + فلاتر بـ `.glass-future`
- `ProductDetail` و `TablouDetail`: بطاقة المنتج الرئيسية بـ `.glass-future` + زر الشراء `.btn-driver-primary` + شارات بـ `.icon-chip`

**3. صفحات الحساب والدفع**
- `CartPage`: عناصر السلة كبطاقات زجاجية، زر Checkout `.btn-driver-primary`
- `CheckoutPage` و `BillingPage` و `Profile` و `MyOrders`: حاويات `.glass-future`، حقول إدخال بحدود سماوية خفيفة
- `CustomerAuth` / `ForgotPassword` / `ResetPassword`: نفس ستايل AdminLogin (بطاقة زجاجية + زر Google neon)

**4. القارئ (Reader)**
- `ReaderHeader` و `ReaderToolbar` و `ReaderSidebar` و `ToolsPanel`: أشرطة زجاجية داكنة مع توهج سماوي
- `ReaderSettings`: لوحة منزلقة بـ `.glass-future`

**5. مكوّنات UI المشتركة (دون حذف)**
- `src/components/ui/button.tsx`: إضافة variants جديدة `driver` و `driver-primary` تستخدم الكلاسات الجاهزة، مع الإبقاء على كل الـ variants القديمة
- `src/components/ui/card.tsx`: إضافة prop اختياري `variant="glass"` يطبّق `.glass-future` (افتراضياً يبقى السلوك القديم)
- `src/components/ui/input.tsx` و `textarea.tsx` و `select.tsx`: ضبط الحدود والـ focus ring لتتبع لون السماوي (`--ring`)
- `Dialog`, `Sheet`, `Popover`, `DropdownMenu`: خلفية `.glass-future` بدل الخلفية الصلبة

**6. تفاصيل تقنية**
- لا حذف لأي ملف أو ميزة — فقط استبدال classNames وإضافة wrappers
- الحفاظ على دعم RTL والترجمة العربية
- الأيقونات تستخدم `.icon-chip-{blue|cyan|gold|green|purple|orange|red}` للتنويع البصري
- إضافة `holo-sheen` بشكل انتقائي (الأزرار والبطاقات الرئيسية فقط) لتجنّب الإفراط البصري

### ترتيب التنفيذ
1. UI primitives (button, card, input, dialog) — لأن أثرها يمتد للموقع كله
2. FeaturesSection + CategoryBar + Landing
3. صفحات الكتالوج والتفاصيل
4. السلة والدفع وصفحات الحساب
5. القارئ

### النتيجة المتوقعة
موقع موحّد بالكامل بهوية "Navy + Cyan Glass Future" على كل صفحة وكل زر وكل بطاقة، مع الإبقاء على 100% من الوظائف الحالية.

