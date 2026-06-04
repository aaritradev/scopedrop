import Link from "next/link";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-on-surface/45 ${className}`}>
      <Link href="/privacy" className="transition-colors hover:text-primary">
        Privacy Policy
      </Link>
      <Link href="/terms" className="transition-colors hover:text-primary">
        Terms of Service
      </Link>
    </div>
  );
}
