"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, ArrowRight, SealCheck, Files, Robot, CurrencyDollar, Lightning, Gauge, CheckCircle, Check, Star, Storefront } from "@phosphor-icons/react";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { detectCurrency, formatPrice, CurrencyInfo } from "@/lib/currency";

const PENDING_BRIEF_INPUT_KEY = "scopedrop.pendingBriefInput";
const PENDING_BRIEF_AUTO_GENERATE_KEY = "scopedrop.pendingBriefAutoGenerate";

const examples = [
  "whatsapp: hey need logo + branding for my bakery, budget around 15k, need by month end",
  "email: we currently use shopify, want a premium redesign, around 200 products, budget tbd",
  "meeting notes: mvp by august, auth + analytics + csv export, budget 80k fixed",
  "slack: client said 'asap launch' but no exact date, need clear scope and payment milestones",
];

function TypewriterPlaceholder() {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [char, setChar] = useState(0);

  useEffect(() => {
    if (index >= examples.length) return;
    const current = examples[index];
    if (char < current.length) {
      const t = setTimeout(() => { setText(current.slice(0, char + 1)); setChar((c) => c + 1); }, 30);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setIndex((i) => i + 1); setChar(0); setText(""); }, 2000);
    return () => clearTimeout(t);
  }, [char, index]);

  return <span>{text}<span className="animate-pulse">|</span></span>;
}

export default function LandingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [input, setInput] = useState("");
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isGeneratingCompare, setIsGeneratingCompare] = useState(false);
  const [isCompareReady, setIsCompareReady] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo>({ currency: "INR", symbol: "₹", isIndia: true });
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    detectCurrency().then(setCurrency);
  }, []);

  const handleDemo = useCallback(() => {
    if (input.length < 20) return;

    sessionStorage.setItem(PENDING_BRIEF_INPUT_KEY, input);
    sessionStorage.setItem(PENDING_BRIEF_AUTO_GENERATE_KEY, "1");

    const continuePath = "/generate?continue=1";
    if (!isLoaded || isSignedIn) {
      router.push(continuePath);
      return;
    }

    router.push(`/sign-in?redirect_url=${encodeURIComponent(continuePath)}`);
  }, [input, isLoaded, isSignedIn, router]);

  const handleGenerateComparison = useCallback(() => {
    if (isGeneratingCompare || isCompareReady) return;
    setIsGeneratingCompare(true);
    window.setTimeout(() => {
      setIsCompareReady(true);
      setIsGeneratingCompare(false);
    }, 900);
  }, [isGeneratingCompare, isCompareReady]);

  const redirectToSignIn = useCallback(
    (targetPath: string) => {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(targetPath)}`);
    },
    [router],
  );

  const handlePricingClick = useCallback(
    (plan: "free" | "starter") => {
      if (plan === "free") {
        redirectToSignIn("/generate");
        return;
      }

      redirectToSignIn(`/settings/billing?plan=${plan}`);
    },
    [redirectToSignIn],
  );

  // Reveal-up animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-up");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Check visibility on load for above-the-fold elements
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal-up");
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add("visible");
      }
    });
  }, []);

  // Parallax mouse effect on decorative floating cards only
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll(".parallax-float");
      const x = (window.innerWidth / 2 - e.pageX) / 40;
      const y = (window.innerHeight / 2 - e.pageY) / 40;
      cards.forEach((card) => {
        (card as HTMLElement).style.setProperty("--parallax-x", `${x}px`);
        (card as HTMLElement).style.setProperty("--parallax-y", `${y}px`);
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <>
      <Nav />

      <main ref={mainRef} className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="min-h-[90vh] flex flex-col justify-center px-6 md:px-16 max-w-[1280px] mx-auto relative pt-32 lg:pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="reveal-up space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                <Sparkle size={14} weight="fill" className="text-primary" />
                <span className="text-primary font-label-md text-xs tracking-widest uppercase">AI-powered project onboarding</span>
              </div>

              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg leading-none text-on-surface">
                Turn client chaos into <span className="text-primary">paid invoices.</span>
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface/60 max-w-xl">
                Paste any client message — email, WhatsApp, meeting notes — and get a professional brief, scope of work, and payment terms in 60 seconds.
              </p>

              <div className="glass-card p-2 rounded-2xl border-white/5 shadow-2xl relative group focus-within:border-primary/40 transition-colors animate-float" style={{ animationDelay: "-1s" }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setShowPlaceholder(false)}
                  placeholder={showPlaceholder ? "" : "Paste your client conversation here..."}
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface/30 min-h-[160px] resize-none font-body-md p-4"
                  rows={4}
                />
                {showPlaceholder && !input && (
                  <div className="absolute top-4 left-4 text-on-surface/30 font-body-md pointer-events-none">
                    <TypewriterPlaceholder />
                  </div>
                )}
                <div className="flex justify-between items-center p-4 border-t border-white/5">
                  <span className="tabular text-on-surface/40 font-label-md text-xs">{input.length} characters</span>
                  <button
                    onClick={handleDemo}
                    disabled={input.length < 20}
                    className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md flex items-center gap-2 hover:brightness-110 active:scale-[0.97] transition-[transform,filter,opacity] duration-200 ease-out group/btn shimmer-btn disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Generate Brief
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" weight="bold" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 text-on-surface/40 font-label-md text-xs">
                <div className="flex items-center gap-2"><CheckCircle size={14} weight="fill" className="text-primary" /> No credit card</div>
                <div className="flex items-center gap-2"><CheckCircle size={14} weight="fill" className="text-primary" /> Free brief today</div>
                <div className="flex items-center gap-2"><CheckCircle size={14} weight="fill" className="text-primary" /> Export to PDF</div>
              </div>
            </div>

            {/* Right — decorative */}
            <div className="relative hidden lg:block reveal-up" style={{ transitionDelay: "200ms" }}>
              <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
              <div className="glass-card p-8 rounded-3xl animate-float parallax-float relative z-10 shadow-[0_32px_64px_rgba(0,0,0,0.4)]" style={{ animationDelay: "0.5s" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <SealCheck size={20} weight="fill" />
                  </div>
                  <div>
                    <p className="text-on-surface/50 font-label-md text-xs uppercase tracking-widest">Generated Brief</p>
                    <h3 className="font-headline-lg text-xl text-on-surface">Flour &amp; Co Branding Brief</h3>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-primary font-label-md text-lg">40%</p>
                      <p className="text-on-surface/40 text-xs">Deposit</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-primary font-label-md text-lg">21 Days</p>
                      <p className="text-on-surface/40 text-xs">Timeline</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-surface-variant border-2 border-surface" />
                    <div className="w-8 h-8 rounded-full bg-primary/40 border-2 border-surface flex items-center justify-center text-[10px] font-bold text-on-surface">+3</div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    <span className="text-[10px] font-bold text-on-surface/60">READY TO SEND</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-10 glass-card p-4 rounded-2xl z-20 flex items-center gap-3 animate-float parallax-float" style={{ animationDelay: "-2s" }}>
                <Gauge size={20} weight="fill" className="text-primary" />
                <span className="font-label-md text-xs text-on-surface">Completed in 9s</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-section-gap px-6 md:px-16 max-w-[1280px] mx-auto">
          <div className="reveal-up mb-24 max-w-2xl">
            <p className="text-primary font-label-md uppercase tracking-[0.2em] mb-4">How It Works</p>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-6 text-on-surface">Three steps. One click. Done.</h2>
            <p className="font-body-lg text-body-lg text-on-surface/50">From messy client message to professional onboarding pack. No templates, no setup, no friction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: <Files size={28} weight="duotone" className="text-primary" />, title: "Paste client conversation", desc: "Drop in any client email, WhatsApp chat, Slack thread, or meeting notes. No cleanup needed.", delay: "0.2s" },
              { step: "02", icon: <Robot size={28} weight="duotone" className="text-primary" />, title: "ScopeDrop builds your brief", desc: "ScopeDrop analyzes the message and generates a complete brief with scope, deliverables, timeline, payment terms, and red flags.", delay: "0.4s" },
              { step: "03", icon: <CurrencyDollar size={28} weight="duotone" className="text-primary" />, title: "Share portal & get paid", desc: "Generate a secure client portal with one click. Get scope approval, collect files, and get paid directly.", delay: "0.6s" },
            ].map((item) => (
              <div key={item.step} className="reveal-up group" style={{ transitionDelay: `${parseInt(item.step) * 100}ms` }}>
                <div className="glass-card p-8 rounded-[32px] h-full relative overflow-hidden group-hover:border-primary/30 transition-all duration-500 animate-float" style={{ animationDelay: item.delay }}>
                  <div className="absolute top-8 right-8 font-display-lg text-6xl text-white/5 pointer-events-none group-hover:text-primary/10 transition-colors">{item.step}</div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h4 className="font-headline-lg text-2xl mb-4 text-on-surface">{item.title}</h4>
                  <p className="font-body-md text-on-surface/50 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── BEFORE & AFTER ─── */}
        <section className="py-section-gap bg-surface-container-lowest/50 relative">
          <div className="px-6 md:px-16 max-w-[1280px] mx-auto">
            <div className="reveal-up text-center mb-24">
              <p className="text-primary font-label-md uppercase tracking-[0.2em] mb-4">Comparison</p>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">From messy message to professional brief.</h2>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 reveal-up">
              <div className="w-full lg:w-1/3 space-y-4">
                <p className="font-label-md text-on-surface/40 uppercase tracking-widest text-center lg:text-left">Before</p>
                <div className="glass-card p-6 rounded-2xl">
                    <p className="text-on-surface/60 font-body-md italic">&quot;hey need logo + full branding for my bakery Flour &amp; Co. need by month end, budget around 15k. warm earthy colors. also need 50 business cards and menu design. let me know&quot;</p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleGenerateComparison}
                  disabled={isGeneratingCompare || isCompareReady}
                  aria-label="Generate after brief preview"
                  className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-[0_0_30px_rgba(255,149,0,0.4)] hover:scale-105 active:scale-[0.97] transition-transform duration-150 ease-out disabled:cursor-default"
                >
                  <Lightning
                    size={20}
                    weight="fill"
                    className={isCompareReady ? "" : "animate-pulse"}
                  />
                </button>
                <div className="h-12 w-px bg-gradient-to-b from-primary to-transparent mt-2" />
              </div>

              <div className="w-full lg:w-2/5 space-y-4">
                <p className="font-label-md text-primary uppercase tracking-widest text-center lg:text-left">After</p>
                {!isCompareReady && (
                  <div className="glass-card p-8 rounded-[32px] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[300px] flex flex-col justify-center items-center text-center">
                    <p className="font-label-md text-on-surface/70 mb-2">
                      {isGeneratingCompare ? "Generating brief preview..." : "Press the bolt to generate"}
                    </p>
                    <p className="text-sm text-on-surface/40">Turn this messy message into a clean client-ready brief.</p>
                  </div>
                )}

                <div className={`glass-card p-8 rounded-[32px] border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ${isCompareReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none absolute"}`}>
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="font-headline-lg text-2xl text-on-surface">Flour &amp; Co Brief</h4>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Signed</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-xl bg-white/5">
                      <Storefront size={20} weight="duotone" className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-label-md text-on-surface">Logo + Branding Package</p>
                        <p className="text-xs text-on-surface/40">Logo suite, color palette, typography, and usage guide</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-on-surface/40 uppercase font-bold mb-2">Deliverables</p>
                      <p className="font-body-md text-sm text-on-surface">Menu design + 50 business cards (print-ready)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-[10px] text-on-surface/40 uppercase font-bold">Timeline</p>
                        <p className="font-label-md text-on-surface">By Month End</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-[10px] text-on-surface/40 uppercase font-bold">Total Budget</p>
                        <p className="font-label-md text-on-surface">₹15,000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="py-section-gap px-6 md:px-16 max-w-[1280px] mx-auto">
          <div className="reveal-up text-center mb-24">
            <p className="text-primary font-label-md uppercase tracking-[0.2em] mb-4">Pricing</p>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Start free. Upgrade when you need more.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* Free */}
            <div className="reveal-up" style={{ transitionDelay: "100ms" }}>
              <div className="glass-card p-8 rounded-[32px] border-white/5 hover:border-white/10 transition-colors animate-float" style={{ animationDelay: "-0.5s" }}>
                <p className="font-headline-lg text-xl mb-2 text-on-surface">Free</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="tabular text-4xl font-bold text-on-surface">{formatPrice(0, currency.currency)}</span>
                </div>
                <p className="text-on-surface/40 text-sm mb-8">3 briefs/month</p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Generate Brief</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> View Generated Report</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Discovery Questions</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Proposal Readiness Intelligence</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Copy Report Text</li>
                </ul>
                <button
                  onClick={() => handlePricingClick("free")}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200 ease-out font-label-md border border-white/10 text-on-surface"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Starter */}
            <div className="reveal-up relative" style={{ transitionDelay: "200ms" }}>
              <div className="glass-card p-10 rounded-[40px] border-primary/40 shadow-[0_32px_64px_rgba(255,149,0,0.1)] relative bg-white/[0.05] animate-float" style={{ animationDelay: "0.5s" }}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 shadow-lg shadow-primary/20">Recommended</div>
                <p className="font-headline-lg text-xl mb-2 text-on-surface">Starter</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="tabular text-4xl font-bold text-on-surface">{formatPrice(currency.isIndia ? 49900 : 999, currency.currency)}</span>
                  <span className="text-on-surface/40">/mo</span>
                </div>
                <p className="text-on-surface/40 text-sm mb-8">Unlimited briefs & projects</p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Everything in Free</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Create Client Portals</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> Invoice Tracking</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> File Collection</li>
                  <li className="flex items-center gap-3 text-sm text-on-surface/70"><Check size={16} weight="bold" className="text-primary" /> PDF Export</li>
                </ul>
                <button
                  onClick={() => handlePricingClick("starter")}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200 ease-out font-label-md border border-white/10 text-on-surface"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Pro */}
            <div className="reveal-up relative" style={{ transitionDelay: "300ms" }}>
              <div className="glass-card p-8 rounded-[32px] border-white/5 hover:border-white/10 transition-colors relative animate-float">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 shadow-lg shadow-primary/20">Launching Soon</div>
                <p className="font-headline-lg text-xl mb-2 text-on-surface">Pro</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="tabular text-5xl font-bold text-on-surface">{formatPrice(currency.isIndia ? 99900 : 1999, currency.currency)}</span>
                  <span className="text-on-surface/40">/mo</span>
                </div>
                <p className="text-on-surface/40 text-sm mb-8">Unlimited briefs</p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm font-semibold text-on-surface"><Star size={16} weight="fill" className="text-primary" /> Everything in Starter</li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-on-surface"><Star size={16} weight="fill" className="text-primary" /> White-label PDF export</li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-on-surface"><Star size={16} weight="fill" className="text-primary" /> Proposal generation</li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-on-surface"><Star size={16} weight="fill" className="text-primary" /> Client-ready documents</li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-on-surface"><Star size={16} weight="fill" className="text-primary" /> Faster AI generation</li>
                </ul>
                <button
                  disabled
                  className="w-full py-5 rounded-2xl bg-primary/40 text-on-primary/70 font-label-md cursor-not-allowed shadow-xl shadow-primary/10"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* ─── CTA ─── */}
        <section className="py-section-gap px-6 md:px-16 max-w-[1280px] mx-auto">
          <div className="reveal-up glass-card p-12 md:p-24 rounded-[48px] bg-gradient-to-br from-primary/10 to-transparent border-primary/20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary blur-[120px]" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary blur-[120px]" />
            </div>
            <div className="relative z-10">
              <p className="text-primary/90 uppercase tracking-[0.2em] text-xs md:text-sm font-bold mb-6">Start in 30 seconds</p>
              <h2 className="font-display-lg text-4xl md:text-6xl mb-6 text-on-surface leading-tight">Turn messy client messages into a clean brief.</h2>
              <p className="font-body-lg text-on-surface/65 mb-10 max-w-2xl mx-auto">No templates, no back-and-forth. Paste chats, emails, or call notes and get a structured project brief you can send today.</p>
              <div className="flex justify-center">
                <button
                  onClick={() => router.push("/sign-up")}
                  className="bg-primary text-on-primary px-12 py-5 rounded-2xl font-label-md text-lg hover:scale-[1.03] active:scale-[0.97] transition-transform duration-150 ease-out shadow-xl shadow-primary/20 shimmer-btn"
                >
                  Get Started Free
                </button>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-on-surface/55">
                <span>3 free briefs included</span>
                <span className="hidden sm:inline">•</span>
                <span>No card required</span>
                <span className="hidden sm:inline">•</span>
                <span>Copy, edit, and export</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
