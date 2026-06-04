"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-display-md font-bold text-on-surface">
          Settings
        </h1>
      </div>

      <div className="space-y-8">
        <section className="card-base p-6">
          <h2 className="text-sm font-semibold mb-4 text-on-surface">
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Email
              </label>
              <input
                type="text"
                value={user?.email ?? ""}
                disabled
                className="input-base text-sm opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Name
              </label>
              <input
                type="text"
                defaultValue={user?.name ?? ""}
                placeholder="Your name"
                className="input-base text-sm"
              />
            </div>
          </div>
        </section>

        <section className="card-base p-6">
          <h2 className="text-sm font-semibold mb-4 text-on-surface">
            Default Payment Terms
          </h2>
          <p className="text-sm mb-4 text-on-surface/55">
            These will pre-fill when generating new briefs.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Deposit (%)
              </label>
              <input type="text" defaultValue="50" className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Payment Terms
              </label>
              <input type="text" defaultValue="Net 30" className="input-base text-sm" />
            </div>
          </div>
        </section>

        <section className="card-base p-6">
          <h2 className="text-sm font-semibold mb-4 text-on-surface">
            Business Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Business Name
              </label>
              <input
                type="text"
                placeholder="Your business name"
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-on-surface/55">
                Logo URL
              </label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                className="input-base text-sm"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
