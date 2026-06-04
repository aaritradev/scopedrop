"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkle } from "@phosphor-icons/react";
import { Suspense, useState } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const error = searchParams.get("error");
  const redirectUrl = searchParams.get("redirect_url");
  const signInHref = redirectUrl ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}` : "/sign-in";

  const continueWithGoogle = () => {
    setIsSubmitting(true);
    window.location.href = `/api/auth/google?state=${encodeURIComponent(redirectUrl || "/dashboard")}`;
  };

  return (
    <div className="w-full max-w-sm glass-card rounded-[28px] p-8 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <Sparkle size={18} weight="fill" />
          <h1 className="font-display-lg text-2xl text-on-surface">ScopeDrop</h1>
        </div>
        <p className="mt-1 text-sm text-on-surface/60">
          Create your account with Google
        </p>
      </div>

      <button
        onClick={continueWithGoogle}
        disabled={isSubmitting}
        className="btn-primary w-full gap-3 py-3.5 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.9 14.6 2 12 2 6.9 2 2.8 6.2 2.8 11.4S6.9 20.8 12 20.8c6.8 0 9.1-4.8 9.1-7.2 0-.5 0-.9-.1-1.3H12z"/>
        </svg>
        {isSubmitting ? "Redirecting..." : "Continue with Google"}
      </button>

      {error === "oauth_denied" && (
        <p className="mt-3 text-xs text-center text-on-surface/70">
          Sign up was cancelled. Please try again.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-on-surface/60">
        Already have an account?{" "}
        <Link href={signInHref} className="text-primary hover:text-primary/90 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
