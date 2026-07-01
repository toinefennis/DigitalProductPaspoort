import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Recycle, QrCode, Database, Leaf, Shield, BarChart3, Shirt, Globe, ArrowRight, CheckCircle, Zap } from "lucide-react";
import { Link } from "wouter";

const slides = [
  {
    id: 1,
    type: "cover",
    bg: "from-green-900 via-green-800 to-emerald-900",
    content: null,
  },
  {
    id: 2,
    type: "problem",
    bg: "from-gray-900 via-gray-800 to-slate-900",
    content: null,
  },
  {
    id: 3,
    type: "espr",
    bg: "from-blue-900 via-blue-800 to-indigo-900",
    content: null,
  },
  {
    id: 4,
    type: "dpp-definition",
    bg: "from-teal-900 via-teal-800 to-green-900",
    content: null,
  },
  {
    id: 5,
    type: "textile-fields",
    bg: "from-emerald-900 via-green-800 to-teal-900",
    content: null,
  },
  {
    id: 6,
    type: "gwc",
    bg: "from-green-800 via-emerald-800 to-green-900",
    content: null,
  },
  {
    id: 7,
    type: "app-overview",
    bg: "from-slate-900 via-gray-900 to-zinc-900",
    content: null,
  },
  {
    id: 8,
    type: "lifecycle",
    bg: "from-violet-900 via-purple-800 to-violet-900",
    content: null,
  },
  {
    id: 9,
    type: "qr-flow",
    bg: "from-cyan-900 via-teal-800 to-cyan-900",
    content: null,
  },
  {
    id: 10,
    type: "mysql-deploy",
    bg: "from-orange-900 via-amber-800 to-orange-900",
    content: null,
  },
  {
    id: 11,
    type: "closing",
    bg: "from-green-900 via-emerald-800 to-green-900",
    content: null,
  },
];

function CoverSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center px-12">
      <div className="mb-8">
        <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
          <Recycle className="w-12 h-12 text-green-300" />
        </div>
        <div className="text-green-300 text-sm font-semibold tracking-widest uppercase mb-4">Groningen Werkt Circulair</div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Digitaal<br />
          <span className="text-green-300">Product</span><br />
          Paspoort
        </h1>
        <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          EU-conforme transparantie voor textielproducten — van grondstof tot recyclage
        </p>
      </div>
      <div className="flex items-center gap-3 mt-8 text-white/50 text-sm">
        <Shirt className="w-4 h-4" />
        <span>ESPR 2025 · GWC DPP Platform · gwcirculair.nl</span>
      </div>
    </div>
  );
}

function ProblemSlide() {
  const stats = [
    { value: "92M", label: "ton textielafval per jaar wereldwijd", color: "text-red-400" },
    { value: "10%", label: "van de wereldwijde CO₂-uitstoot komt van fashion", color: "text-orange-400" },
    { value: "1%", label: "van kleding wordt gerecycled naar nieuw textiel", color: "text-yellow-400" },
    { value: "€1500", label: "aan kleding gooit de gemiddelde Nederlander weg", color: "text-amber-400" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-red-400 text-sm font-semibold tracking-widest uppercase mb-4">Het Probleem</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
        Fast fashion heeft<br />een <span className="text-red-400">verborgen prijs</span>
      </h2>
      <p className="text-white/60 text-lg mb-10 max-w-2xl">
        Consumenten weten niet wat er in hun kleding zit, hoe het gemaakt is of wat ze ermee moeten doen als het versleten is. Transparantie ontbreekt volledig.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        {stats.map((s, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-white/60 text-sm leading-snug">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ESPRSlide() {
  const items = [
    { year: "2025", label: "ESPR van kracht", desc: "Ecodesign for Sustainable Products Regulation treedt in werking" },
    { year: "2026", label: "DPP verplicht textiel", desc: "Digitaal Product Paspoort verplicht voor alle textielbedrijven in de EU" },
    { year: "2030", label: "Volledige handhaving", desc: "Boetes en marktverboden voor niet-conforme producten" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">EU Regelgeving</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
        ESPR maakt DPP<br /><span className="text-blue-300">verplicht</span>
      </h2>
      <p className="text-white/60 text-lg mb-10 max-w-2xl">
        De Europese Unie verplicht bedrijven digitale productpaspoorten bij te houden — inclusief materiaalsamenstelling, CO₂-voetafdruk en herstellingsmogelijkheden.
      </p>
      <div className="space-y-4 max-w-3xl">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-5 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl px-3 py-2 text-blue-300 font-bold text-lg shrink-0">
              {item.year}
            </div>
            <div>
              <div className="font-semibold text-white mb-1">{item.label}</div>
              <div className="text-white/50 text-sm">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-2 text-blue-300 text-sm">
        <Shield className="w-4 h-4" />
        <span>Europese Verordening 2024/1781 — bindend voor alle EU-lidstaten</span>
      </div>
    </div>
  );
}

function DPPDefinitionSlide() {
  const elements = [
    { icon: QrCode, label: "Unieke QR-code", desc: "Elke product krijgt een eigen scanbare code" },
    { icon: Database, label: "Digitaal dossier", desc: "Alle informatie levenslang bijgehouden" },
    { icon: Globe, label: "Publiek toegankelijk", desc: "Via gwcirculair.nl/dpp/[GTIN]" },
    { icon: Shield, label: "EU-conform", desc: "Voldoet aan ESPR 2025 eisen" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-4">Wat is een DPP?</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
        Een digitaal<br /><span className="text-teal-300">identiteitsbewijs</span><br />voor elk product
      </h2>
      <p className="text-white/60 text-lg mb-10 max-w-2xl">
        Het Digitaal Product Paspoort is een gestandaardiseerd digitaal dossier dat de volledige levenscyclus van een product bijhoudt — van productie tot recycling.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        {elements.map((el, i) => {
          const Icon = el.icon;
          return (
            <div key={i} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="bg-teal-500/20 rounded-xl p-2 shrink-0">
                <Icon className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="font-semibold text-white mb-1">{el.label}</div>
                <div className="text-white/50 text-sm">{el.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextileFieldsSlide() {
  const fase1 = ["Herstelbaarheidsindex (1-10)", "Duurzaamheidsscore (1-10)", "Wassenssymbolen (ISO 3758)", "CO₂-voetafdruk per levensfase"];
  const fase2 = ["Waterverbruik in liters", "Energieverbruik (kWh)", "% Hernieuwbare energie", "Microplastic afgifte per wasbeurt"];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-4">DPP Inhoud voor Textiel</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Wat moet er<br /><span className="text-emerald-300">in het paspoort</span>?
      </h2>
      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-emerald-400 text-xs font-bold tracking-wider uppercase mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Fase 1 — ESPR 2025
          </div>
          <ul className="space-y-3">
            {fase1.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-blue-400 text-xs font-bold tracking-wider uppercase mb-4 flex items-center gap-2">
            <Leaf className="w-4 h-4" /> Fase 2 — ESPR 2026
          </div>
          <ul className="space-y-3">
            {fase2.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-white/40 text-sm mt-6">
        + Materiaalsamenstelling · GTIN barcode · Herkomst · Recyclinginstructies · QR-code
      </p>
    </div>
  );
}

function GWCSlide() {
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-green-400 text-sm font-semibold tracking-widest uppercase mb-4">Over GWC</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
        Groningen<br /><span className="text-green-300">Werkt Circulair</span>
      </h2>
      <p className="text-white/70 text-lg max-w-2xl mb-10 leading-relaxed">
        Groningen Werkt Circulair is een community-gedreven platform dat lokale bedrijven, designers en consumenten verbindt om samen de textielindustrie te verduurzamen. Van reparatie-ateliers tot uitleensystemen — GWC maakt circulair textiel bereikbaar.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {[
          { value: "Repareren", icon: "🔧", desc: "Verleng de levensduur" },
          { value: "Uitlenen", icon: "🤝", desc: "Deel in plaats van bezitten" },
          { value: "Recyclen", icon: "♻️", desc: "Sluit de materiaalcyclus" },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-semibold text-white mb-1">{item.value}</div>
            <div className="text-white/50 text-xs">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppOverviewSlide() {
  const features = [
    { icon: "📦", label: "Productbeheer", desc: "Producten aanmaken, bewerken en GTIN-codes beheren" },
    { icon: "📋", label: "Levenscyclus Events", desc: "Reparatie, reiniging, uitleen en recycling bijhouden" },
    { icon: "📸", label: "QR Code Scanner", desc: "Scan barcodes met de camera van je telefoon" },
    { icon: "🌐", label: "Publieke DPP Pagina", desc: "Iedereen kan het paspoort scannen — geen app nodig" },
    { icon: "📊", label: "MySQL Export", desc: "Directe sync naar gwcirculair.nl/dpp/[GTIN]" },
    { icon: "👥", label: "Gebruikersbeheer", desc: "Rollen: admin, manager en gebruiker" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-4">De Applicatie</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Alles in één<br /><span className="text-gray-300">platform</span>
      </h2>
      <div className="grid grid-cols-3 gap-4 max-w-4xl">
        {features.map((f, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
            <div className="text-2xl mb-3">{f.icon}</div>
            <div className="font-semibold text-white mb-1 text-sm">{f.label}</div>
            <div className="text-white/50 text-xs leading-snug">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LifecycleSlide() {
  const events = [
    { icon: "✨", label: "Creatie", desc: "Product aanmaken met materialen en foto" },
    { icon: "🔧", label: "Reparatie", desc: "Schade herstellen, kwaliteit bewaken" },
    { icon: "🤝", label: "Uitleen", desc: "Lener registreren met verwachte retour" },
    { icon: "↩️", label: "Retour", desc: "Conditie beoordelen bij terugkomst" },
    { icon: "🔄", label: "Refurbish", desc: "Groot onderhoud of remake registreren" },
    { icon: "♻️", label: "Recycling", desc: "Einde levensduur correct afhandelen" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">Levenscyclus Tracking</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Elk moment<br /><span className="text-violet-300">vastgelegd</span>
      </h2>
      <div className="grid grid-cols-3 gap-4 max-w-3xl">
        {events.map((e, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-2xl mb-2">{e.icon}</div>
            <div className="font-semibold text-white mb-1 text-sm">{e.label}</div>
            <div className="text-white/50 text-xs">{e.desc}</div>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-sm mt-6">
        Elk event wordt met datum, foto en omschrijving opgeslagen in het paspoort
      </p>
    </div>
  );
}

function QRFlowSlide() {
  const steps = [
    { num: "1", label: "Product aanmaken", desc: "Voeg product toe in de app — GTIN wordt automatisch gegenereerd" },
    { num: "2", label: "QR-code genereren", desc: "De app maakt automatisch een QR-code aan voor elk product" },
    { num: "3", label: "Label bevestigen", desc: "QR-code op het kledingstuk of verpakking plakken" },
    { num: "4", label: "Consument scant", desc: "Scan met elke telefoon → gwcirculair.nl/dpp/[GTIN]" },
  ];
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-4">QR-code Flow</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Van product<br />naar <span className="text-cyan-300">publiek paspoort</span>
      </h2>
      <div className="space-y-4 max-w-3xl">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-full w-10 h-10 flex items-center justify-center text-cyan-300 font-bold text-lg shrink-0">
              {step.num}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-0.5">{step.label}</div>
              <div className="text-white/50 text-sm">{step.desc}</div>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MySQLDeploySlide() {
  return (
    <div className="flex flex-col justify-center h-full px-12 text-white">
      <div className="text-orange-400 text-sm font-semibold tracking-widest uppercase mb-4">Synchronisatie</div>
      <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
        Van Replit naar<br /><span className="text-orange-300">gwcirculair.nl</span>
      </h2>
      <p className="text-white/60 text-lg mb-8 max-w-2xl">
        Met één klik worden alle productpaspoorten gesynchroniseerd naar de externe website — zodat bezoekers ze kunnen bekijken zonder in te loggen.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            <Database className="w-5 h-5" /> MySQL Export
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>✓ Test verbinding</li>
            <li>✓ Exporteer alle producten</li>
            <li>✓ Auto-update bij duplicaten</li>
            <li>✓ Alle ESPR-velden meegenomen</li>
          </ul>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-blue-400 font-bold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5" /> FTP Deploy
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>✓ PHP presentatiepagina</li>
            <li>✓ URL: /dpp/[GTIN]</li>
            <li>✓ Zonder inloggen toegankelijk</li>
            <li>✓ Responsive mobiel design</li>
          </ul>
        </div>
      </div>
      <div className="mt-6 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-orange-200 text-sm">
        🔐 Alleen administrators kunnen exporteren en deployen — bescherming van productdata
      </div>
    </div>
  );
}

function ClosingSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center px-12">
      <div className="mb-8">
        <div className="text-6xl mb-6">🌿</div>
        <div className="text-green-300 text-sm font-semibold tracking-widest uppercase mb-4">Klaar voor de toekomst</div>
        <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Circulair textiel<br />begint met<br /><span className="text-green-300">transparantie</span>
        </h2>
        <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed mb-10">
          Het GWC DPP Platform geeft elk kledingstuk een stem — en consumenten de informatie die ze nodig hebben om bewuste keuzes te maken.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <div className="bg-green-500 hover:bg-green-400 text-white font-semibold px-8 py-3 rounded-full transition-colors cursor-pointer inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Open de App
            </div>
          </Link>
          <a href="https://gwcirculair.nl" target="_blank" rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-full transition-colors inline-flex items-center gap-2 border border-white/20">
            <Globe className="w-4 h-4" /> gwcirculair.nl
          </a>
        </div>
      </div>
    </div>
  );
}

const slideComponents: Record<string, () => JSX.Element> = {
  cover: CoverSlide,
  problem: ProblemSlide,
  espr: ESPRSlide,
  "dpp-definition": DPPDefinitionSlide,
  "textile-fields": TextileFieldsSlide,
  gwc: GWCSlide,
  "app-overview": AppOverviewSlide,
  lifecycle: LifecycleSlide,
  "qr-flow": QRFlowSlide,
  "mysql-deploy": MySQLDeploySlide,
  closing: ClosingSlide,
};

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const total = slides.length;

  const goTo = useCallback((index: number) => {
    if (animating) return;
    if (index < 0 || index >= total) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 200);
  }, [animating, total]);

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") { window.location.href = "/"; }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  const slide = slides[current];
  const SlideComponent = slideComponents[slide.type];

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${slide.bg} transition-colors duration-500 z-50`}>
      <div
        className={`h-full flex flex-col transition-opacity duration-200 ${animating ? "opacity-0" : "opacity-100"}`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 shrink-0">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Recycle className="w-4 h-4" />
            <span className="font-medium">GWC DPP</span>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === current
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
          <Link href="/">
            <button className="text-white/40 hover:text-white transition-colors p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-hidden">
          <SlideComponent />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-8 py-4 shrink-0">
          <span className="text-white/30 text-sm font-mono">
            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              disabled={current === 0}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              disabled={current === total - 1}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span className="text-white/30 text-xs hidden sm:block">← → pijltjes of klik</span>
        </div>
      </div>
    </div>
  );
}
