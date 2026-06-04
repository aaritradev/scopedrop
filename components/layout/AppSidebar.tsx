"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Files,
  Gear,
  CreditCard,
  SignOut,
  Sparkle,
  Lightning,
  X,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "My Briefs", icon: Files },
  { href: "/generate", label: "New Brief", icon: Lightning },
  { href: "/settings", label: "Settings", icon: Gear },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const plan = user?.plan ?? "free";
  const creditsRemaining = typeof user?.credits_remaining === "number"
    ? user.credits_remaining
    : null;

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-white/[0.07] bg-[#0e0e10]">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/[0.07] px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkle size={14} weight="fill" className="text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight text-on-surface">
            ScopeDrop
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors md:hidden"
        >
          <X size={14} className="text-on-surface/50" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150"
              style={{
                color: isActive
                  ? "#e3e2e5"
                  : "rgba(227, 226, 229, 0.45)",
                backgroundColor: isActive
                  ? "rgba(255, 149, 0, 0.08)"
                  : "transparent",
              }}
            >
              <Icon
                size={16}
                weight={isActive ? "fill" : "regular"}
                className={
                  isActive
                    ? "text-primary"
                    : "text-on-surface/40 transition-colors duration-150 group-hover:text-on-surface/70"
                }
              />
              <span
                style={{
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.07] p-3">
        {/* Plan card */}
        <div className="mb-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface/40">
              Plan
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: plan === "pro" ? "#4b2800" : "rgba(227,226,229,0.5)",
                backgroundColor:
                  plan === "pro"
                    ? "#ff9500"
                    : "rgba(255,255,255,0.05)",
              }}
            >
              {plan}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-on-surface/55">
            {plan === "pro"
              ? "Unlimited briefs"
              : creditsRemaining === null
                ? "Loading credits..."
                : `${creditsRemaining} brief${creditsRemaining === 1 ? "" : "s"} remaining`}
          </p>
        </div>

        {/* User info */}
        <div className="px-3.5 py-2">
          <p className="truncate text-xs text-on-surface/40">
            {user?.email ?? ""}
          </p>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          className="group flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-150"
          style={{ color: "rgba(227, 226, 229, 0.45)" }}
        >
          <SignOut
            size={16}
            className="transition-colors duration-150 group-hover:text-on-surface/70"
            style={{ color: "rgba(227, 226, 229, 0.3)" }}
          />
          <span className="group-hover:text-on-surface/70 transition-colors duration-150">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}
