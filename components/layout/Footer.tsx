import { Sparkle } from "@phosphor-icons/react";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-14 md:py-16 border-t border-white/5 bg-surface relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start px-6 md:px-16 max-w-[1280px] mx-auto gap-10">
        <div className="space-y-4 max-w-md">
          <div className="flex items-center gap-2">
            <Sparkle size={20} weight="fill" className="text-primary" />
            <span className="font-display-lg text-xl text-primary tracking-tight">ScopeDrop</span>
          </div>
          <p className="font-body-md text-on-surface/55 max-w-sm">
            Turn scattered client chats into clear project briefs in minutes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-14 gap-y-8">
          <div className="space-y-4">
            <h5 className="font-label-md text-xs uppercase tracking-widest text-on-surface/30">Product</h5>
            <ul className="space-y-2">
              <li><Link className="text-on-surface/60 hover:text-primary transition-colors text-sm" href="/#features">Features</Link></li>
              <li><Link className="text-on-surface/60 hover:text-primary transition-colors text-sm" href="/#pricing">Pricing</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-label-md text-xs uppercase tracking-widest text-on-surface/30">Legal</h5>
            <ul className="space-y-2">
              <li><Link className="text-on-surface/60 hover:text-primary transition-colors text-sm" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="text-on-surface/60 hover:text-primary transition-colors text-sm" href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 md:px-16 mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="font-body-md text-on-surface/35 text-xs">&copy; {year} ScopeDrop. All rights reserved.</p>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-on-surface/40 font-label-md">All systems operational</span>
        </div>
      </div>
    </footer>
  );
}
