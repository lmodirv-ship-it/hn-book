UPDATE public.svg_templates
SET fields = '[
  {"key":"logo","label":"شعار الشركة (اختياري)","side":"front","type":"image","defaultValue":""},
  {"key":"monogram","label":"الحرفين (يظهر بدون شعار)","side":"front","type":"text","defaultValue":"HN"},
  {"key":"tagline","label":"الشعار التعريفي","side":"front","type":"text","defaultValue":"Excellence · Elegance · Trust"},
  {"key":"name","label":"الاسم الكامل","side":"back","type":"text","defaultValue":"محمد أمين"},
  {"key":"job","label":"المسمى الوظيفي","side":"back","type":"text","defaultValue":"Managing Director"},
  {"key":"phone","label":"الهاتف","side":"back","type":"text","defaultValue":"+212 6 00 00 00 00"},
  {"key":"email","label":"البريد الإلكتروني","side":"back","type":"text","defaultValue":"contact@hngroupe.com"},
  {"key":"website","label":"الموقع","side":"back","type":"text","defaultValue":"www.hngroupe.com"},
  {"key":"address","label":"العنوان","side":"back","type":"text","defaultValue":"Casablanca, Morocco"}
]'::jsonb,
front_svg_content = $SVG$<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 900 500" width="900" height="500" font-family="'DM Sans', 'Helvetica Neue', Arial, sans-serif">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="50%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a6d1f"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#f5d97a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="logoClip"><circle cx="450" cy="220" r="68"/></clipPath>
  </defs>
  <rect width="900" height="500" fill="url(#bgGrad)"/>
  <rect width="900" height="500" fill="url(#glow)"/>
  <rect x="20" y="20" width="860" height="460" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" opacity="0.6"/>
  <rect x="28" y="28" width="844" height="444" fill="none" stroke="#D4AF37" stroke-width="0.4" opacity="0.35"/>
  <path d="M0,90 C180,30 360,150 540,90 C720,30 870,120 900,80 L900,0 L0,0 Z" fill="url(#goldGrad)" opacity="0.18"/>
  <path d="M0,110 C180,50 360,170 540,110 C720,50 870,140 900,100" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.7"/>
  <g transform="translate(450 220)">
    <circle r="78" fill="none" stroke="url(#goldGrad)" stroke-width="2"/>
    <circle r="68" fill="none" stroke="#D4AF37" stroke-width="0.6" opacity="0.5"/>
    <text text-anchor="middle" dominant-baseline="middle" y="6" font-size="58" font-weight="700" fill="url(#goldGrad)" letter-spacing="4">{{monogram}}</text>
  </g>
  <image href="{{logo}}" xlink:href="{{logo}}" x="382" y="152" width="136" height="136" preserveAspectRatio="xMidYMid meet" clip-path="url(#logoClip)"/>
  <text x="450" y="340" text-anchor="middle" font-size="26" font-weight="600" fill="#f5d97a" letter-spacing="6">HN GROUPE</text>
  <line x1="350" y1="360" x2="550" y2="360" stroke="url(#goldGrad)" stroke-width="1"/>
  <circle cx="450" cy="360" r="3" fill="#D4AF37"/>
  <text x="450" y="395" text-anchor="middle" font-size="16" font-weight="400" fill="#cfcfcf" letter-spacing="3" font-style="italic">{{tagline}}</text>
  <path d="M0,420 C180,460 360,400 540,440 C720,480 870,420 900,450 L900,500 L0,500 Z" fill="url(#goldGrad)" opacity="0.22"/>
  <path d="M0,440 C180,480 360,420 540,460 C720,500 870,440 900,470" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.6"/>
</svg>$SVG$,
updated_at = now()
WHERE name = 'Luxury Black & Gold Business Card';