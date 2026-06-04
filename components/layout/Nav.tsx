"use client";

import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";

export function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10" style={{ background: "rgba(18, 19, 21, 0.4)", backdropFilter: "blur(24px)" }}>
      <div className="flex justify-between items-center px-6 md:px-16 py-4 max-w-[1280px] mx-auto">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <Sparkle size={28} weight="fill" className="text-primary-container group-hover:rotate-12 transition-transform" />
          <span className="font-display-lg text-2xl md:text-3xl text-primary tracking-tighter">ScopeDrop</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#features" className="font-label-md text-label-md text-on-surface/70 hover:text-on-surface transition-colors">Features</Link>
          <Link href="/#pricing" className="font-label-md text-label-md text-on-surface/70 hover:text-on-surface transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden md:block font-label-md text-label-md text-on-surface/70 hover:text-on-surface transition-colors">Dashboard</Link>
          <Link href="/sign-up" className="bg-primary-container text-on-primary py-3 px-6 rounded-lg font-label-md text-label-md hover:scale-105 transition-transform duration-200 shimmer-btn">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
