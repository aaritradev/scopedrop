import { LegalLinks } from "@/components/layout/LegalLinks";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-8">
      {children}
      <LegalLinks className="mt-8" />
    </div>
  );
}
