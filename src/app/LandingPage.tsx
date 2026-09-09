import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ArrowRight,
  Calendar,
  Star,
  Trophy,
  Users,
  Languages,
} from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { useLocale } from "@/i18n";

const HERO_IMG =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=2400&q=80";

const FEATURES = [
  { icon: Calendar, title: "landing.feat.reservas.title", desc: "landing.feat.reservas.desc", accent: "#43A832" },
  { icon: Users, title: "landing.feat.times.title", desc: "landing.feat.times.desc", accent: "#00B4D4" },
  { icon: Trophy, title: "landing.feat.torneios.title", desc: "landing.feat.torneios.desc", accent: "#ffd600" },
  { icon: Star, title: "landing.feat.ratings.title", desc: "landing.feat.ratings.desc", accent: "#C41230" },
] as const;

const STEPS = [
  { n: "01", title: "landing.how.1.title", desc: "landing.how.1.desc" },
  { n: "02", title: "landing.how.2.title", desc: "landing.how.2.desc" },
  { n: "03", title: "landing.how.3.title", desc: "landing.how.3.desc" },
] as const;

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage() {
  const { t, toggleLocale, locale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0f0f0] font-sans overflow-x-hidden">
      {/* Ambient field glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 70% 10%, rgba(67,168,50,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 10% 80%, rgba(196,18,48,0.12), transparent 50%)",
        }}
      />

      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 lg:px-10">
        <a href="#top" className="flex items-center gap-3 min-w-0">
          <Logo alt={t("brand.alt")} markClassName="h-11 w-11" showWordmark />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <button type="button" onClick={() => scrollTo("features")} className="hover:text-white transition-colors">
            {t("landing.nav.features")}
          </button>
          <button type="button" onClick={() => scrollTo("how")} className="hover:text-white transition-colors">
            {t("landing.nav.how")}
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t("landing.lang.aria")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-mono tracking-wider text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t("landing.lang")}</span>
            <span className="text-white/35">|</span>
            <span className="text-primary font-semibold">{locale.toUpperCase()}</span>
          </button>

          <Link
            to="/app"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white hover:brightness-110 transition"
          >
            {t("landing.nav.cta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero — full-bleed */}
      <section id="top" className="relative min-h-[100svh] flex flex-col justify-end pb-16 lg:pb-24 pt-8">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/75 to-[#050505]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-[#050505]/40 to-transparent" />
        </div>

        <div className="relative z-10 px-5 lg:px-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-[Oswald] text-4xl sm:text-5xl lg:text-6xl tracking-wide text-primary uppercase mb-4"
          >
            {t("landing.hero.brand")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="font-[Oswald] text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-wide text-white uppercase mb-5"
          >
            {t("landing.hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="text-base sm:text-lg text-white/70 max-w-xl mb-8 leading-relaxed"
          >
            {t("landing.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:brightness-110 transition shadow-[0_0_40px_rgba(67,168,50,0.25)]"
            >
              {t("landing.hero.cta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => scrollTo("features")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-5 py-3 text-sm text-white/85 hover:bg-white/10 transition backdrop-blur-sm"
            >
              {t("landing.hero.secondary")}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-5 lg:px-10 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary mb-3">
            {t("landing.features.eyebrow")}
          </p>
          <h2 className="font-[Oswald] text-3xl sm:text-4xl uppercase tracking-wide mb-3">
            {t("landing.features.title")}
          </h2>
          <p className="text-white/55 mb-12 max-w-lg">{t("landing.features.subtitle")}</p>

          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-12">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="group"
              >
                <div
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                  style={{ background: `${f.accent}18`, color: f.accent }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-[Oswald] text-xl uppercase tracking-wide mb-2 group-hover:text-primary transition-colors">
                  {t(f.title)}
                </h3>
                <p className="text-sm text-white/55 leading-relaxed">{t(f.desc)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="relative z-10 px-5 lg:px-10 py-16 lg:py-24 border-t border-white/8">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#00B4D4] mb-3">
            {t("landing.how.eyebrow")}
          </p>
          <h2 className="font-[Oswald] text-3xl sm:text-4xl uppercase tracking-wide mb-3">
            {t("landing.how.title")}
          </h2>
          <p className="text-white/55 mb-14 max-w-lg">{t("landing.how.subtitle")}</p>

          <ol className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <span className="font-mono text-sm text-primary/80 mb-3 block">{s.n}</span>
                <h3 className="font-[Oswald] text-xl uppercase tracking-wide mb-2">{t(s.title)}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{t(s.desc)}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 lg:px-10 py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/15 via-[#0d0d0d] to-accent/10 px-6 py-14 lg:py-16"
        >
          <h2 className="font-[Oswald] text-3xl sm:text-4xl uppercase tracking-wide mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">{t("landing.cta.subtitle")}</p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            {t("landing.cta.button")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 px-5 lg:px-10 py-8 border-t border-white/8 text-center text-xs text-white/40">
        {t("landing.footer.rights", { year })}
      </footer>
    </div>
  );
}
