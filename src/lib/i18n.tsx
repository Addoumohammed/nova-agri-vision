import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

const dict = {
  en: {
    "brand.name": "Nova Pro",
    "brand.tagline": "The intelligence layer for global agri-trade",
    "nav.dashboard": "Dashboard",
    "nav.novaAi": "Nova AI",
    "nav.aiCopilot": "AI Copilot",
    "nav.market": "Market",
    "nav.marketplace": "Marketplace",
    "nav.suppliers": "Suppliers",
    "nav.buyers": "Buyers",
    "nav.orders": "Orders",
    "nav.invoices": "Invoices",
    "nav.shipments": "Shipments",
    "nav.analytics": "Analytics",
    "nav.weatherIntel": "Weather Intelligence",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.export": "Export",
    "nav.weather": "Weather",
    "nav.profile": "Profile",
    "nav.section.overview": "Overview",
    "nav.section.network": "Network",
    "nav.section.operations": "Operations",
    "nav.section.insights": "Insights",
    "nav.section.account": "Account",
    "nav.signIn": "Sign in",
    "nav.getStarted": "Get started",
    "cta.launch": "Launch dashboard",
    "cta.explore": "Explore Nova AI",

    "auth.login.title": "Welcome back",
    "auth.login.subtitle": "Sign in to your Nova Pro workspace",
    "auth.register.title": "Create your workspace",
    "auth.register.subtitle": "Join thousands of agri-traders worldwide",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Full name",
    "auth.company": "Company",
    "auth.remember": "Remember me",
    "auth.forgot": "Forgot password?",
    "auth.signIn": "Sign in",
    "auth.signUp": "Create account",
    "auth.orContinue": "or continue with",
    "auth.haveAccount": "Already have an account?",
    "auth.noAccount": "Don't have an account?",

    "dash.welcome": "Welcome back, Karim",
    "dash.overview": "Here is what's moving in your markets today.",
    "dash.kpi.revenue": "Trade Volume",
    "dash.kpi.orders": "Active Shipments",
    "dash.kpi.partners": "Global Partners",
    "dash.kpi.ai": "AI Insights",
    "dash.chart.title": "Export performance",
    "dash.chart.sub": "Last 12 months · USD",
    "dash.activity": "Recent activity",
    "dash.pipeline": "Live shipments",

    "novaai.title": "Nova AI",
    "novaai.subtitle": "Your co-pilot for agricultural intelligence",
    "novaai.placeholder": "Ask about prices, forecasts, buyers, regulations…",
    "novaai.send": "Send",
    "novaai.suggestion1": "Best export markets for Egyptian oranges this quarter?",
    "novaai.suggestion2": "Forecast wheat prices for the next 30 days",
    "novaai.suggestion3": "Compliance checklist for shipping to the EU",
    "novaai.suggestion4": "Weather risk for Nile Delta next week",

    "market.title": "Market",
    "market.sub": "Real-time commodity prices",
    "market.symbol": "Commodity",
    "market.price": "Price",
    "market.change": "24h",
    "market.volume": "Volume",
    "market.market": "Market",

    "export.title": "Export",
    "export.sub": "Manage shipments, invoices and buyers",
    "export.new": "New shipment",
    "export.id": "Shipment",
    "export.destination": "Destination",
    "export.product": "Product",
    "export.status": "Status",
    "export.eta": "ETA",
    "export.value": "Value",

    "weather.title": "Weather",
    "weather.sub": "Growing-region intelligence",
    "weather.now": "Now",
    "weather.humidity": "Humidity",
    "weather.wind": "Wind",
    "weather.rain": "Rain",
    "weather.forecast": "7-day forecast",
    "weather.risk": "Regional risk",

    "profile.title": "Profile",
    "profile.sub": "Manage your account and workspace",
    "profile.save": "Save changes",
    "profile.plan": "Enterprise plan",
    "profile.verified": "Verified exporter",
  },
  ar: {
    "brand.name": "نوفا برو",
    "brand.tagline": "طبقة الذكاء لتجارة الزراعة العالمية",
    "nav.dashboard": "لوحة التحكم",
    "nav.novaAi": "نوفا AI",
    "nav.aiCopilot": "المساعد الذكي",
    "nav.market": "السوق",
    "nav.marketplace": "السوق التجاري",
    "nav.suppliers": "الموردون",
    "nav.buyers": "المشترون",
    "nav.orders": "الطلبات",
    "nav.invoices": "الفواتير",
    "nav.shipments": "الشحنات",
    "nav.analytics": "التحليلات",
    "nav.weatherIntel": "ذكاء الطقس",
    "nav.reports": "التقارير",
    "nav.settings": "الإعدادات",
    "nav.export": "التصدير",
    "nav.weather": "الطقس",
    "nav.profile": "الملف الشخصي",
    "nav.section.overview": "نظرة عامة",
    "nav.section.network": "الشبكة",
    "nav.section.operations": "العمليات",
    "nav.section.insights": "الرؤى",
    "nav.section.account": "الحساب",
    "nav.signIn": "تسجيل الدخول",
    "nav.getStarted": "ابدأ الآن",
    "cta.launch": "افتح لوحة التحكم",
    "cta.explore": "استكشف نوفا AI",

    "auth.login.title": "مرحبًا بعودتك",
    "auth.login.subtitle": "سجل الدخول إلى مساحة عمل نوفا برو",
    "auth.register.title": "أنشئ مساحة عملك",
    "auth.register.subtitle": "انضم إلى آلاف المصدّرين حول العالم",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.name": "الاسم الكامل",
    "auth.company": "الشركة",
    "auth.remember": "تذكرني",
    "auth.forgot": "نسيت كلمة المرور؟",
    "auth.signIn": "تسجيل الدخول",
    "auth.signUp": "إنشاء حساب",
    "auth.orContinue": "أو تابع باستخدام",
    "auth.haveAccount": "لديك حساب بالفعل؟",
    "auth.noAccount": "ليس لديك حساب؟",

    "dash.welcome": "مرحبًا بعودتك يا كريم",
    "dash.overview": "إليك ما يحدث في أسواقك اليوم.",
    "dash.kpi.revenue": "حجم التجارة",
    "dash.kpi.orders": "الشحنات النشطة",
    "dash.kpi.partners": "الشركاء العالميون",
    "dash.kpi.ai": "رؤى الذكاء الاصطناعي",
    "dash.chart.title": "أداء التصدير",
    "dash.chart.sub": "آخر 12 شهرًا · دولار أمريكي",
    "dash.activity": "النشاط الأخير",
    "dash.pipeline": "الشحنات الحية",

    "novaai.title": "نوفا AI",
    "novaai.subtitle": "مساعدك الذكي لتجارة الزراعة",
    "novaai.placeholder": "اسأل عن الأسعار، التوقعات، المشترين، اللوائح…",
    "novaai.send": "إرسال",
    "novaai.suggestion1": "أفضل أسواق تصدير البرتقال المصري هذا الربع؟",
    "novaai.suggestion2": "توقّع أسعار القمح خلال الثلاثين يومًا القادمة",
    "novaai.suggestion3": "قائمة الامتثال للشحن إلى الاتحاد الأوروبي",
    "novaai.suggestion4": "مخاطر الطقس في دلتا النيل الأسبوع القادم",

    "market.title": "السوق",
    "market.sub": "أسعار السلع في الوقت الفعلي",
    "market.symbol": "السلعة",
    "market.price": "السعر",
    "market.change": "24 ساعة",
    "market.volume": "الحجم",
    "market.market": "السوق",

    "export.title": "التصدير",
    "export.sub": "إدارة الشحنات والفواتير والمشترين",
    "export.new": "شحنة جديدة",
    "export.id": "الشحنة",
    "export.destination": "الوجهة",
    "export.product": "المنتج",
    "export.status": "الحالة",
    "export.eta": "الوصول المتوقع",
    "export.value": "القيمة",

    "weather.title": "الطقس",
    "weather.sub": "معلومات مناطق الزراعة",
    "weather.now": "الآن",
    "weather.humidity": "الرطوبة",
    "weather.wind": "الرياح",
    "weather.rain": "الأمطار",
    "weather.forecast": "توقعات 7 أيام",
    "weather.risk": "المخاطر الإقليمية",

    "profile.title": "الملف الشخصي",
    "profile.sub": "إدارة حسابك ومساحة عملك",
    "profile.save": "حفظ التغييرات",
    "profile.plan": "خطة المؤسسات",
    "profile.verified": "مصدّر موثق",
  },
} as const;

type Key = keyof (typeof dict)["en"];

const I18nContext = createContext<{
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (k: Key) => string;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}>({
  locale: "en",
  dir: "ltr",
  t: (k) => k,
  setLocale: () => {},
  toggle: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("nova-locale")) as Locale | null;
    if (stored === "en" || stored === "ar") setLocaleState(stored);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", locale);
    html.setAttribute("dir", dir);
    try {
      localStorage.setItem("nova-locale", locale);
    } catch {}
  }, [locale, dir]);

  const t = (k: Key) => dict[locale][k] ?? k;

  return (
    <I18nContext.Provider
      value={{
        locale,
        dir,
        t,
        setLocale: setLocaleState,
        toggle: () => setLocaleState((l) => (l === "en" ? "ar" : "en")),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
