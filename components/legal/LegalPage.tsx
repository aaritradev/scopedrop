import Link from "next/link";

type LegalSection = {
  title: string;
  body?: string[];
  items?: string[];
};

type LegalPageProps = {
  label: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPage({ label, title, intro, lastUpdated, sections }: LegalPageProps) {
  return (
    <main className="min-h-[100dvh] bg-surface text-on-surface">
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary-container shadow-[0_0_18px_rgba(255,149,0,0.55)]" />
            <span className="font-display-lg text-2xl tracking-tight text-primary">ScopeDrop</span>
          </Link>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-12 md:grid-cols-[240px_minmax(0,1fr)] md:px-10 md:py-16">
        <aside className="md:sticky md:top-10 md:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{label}</p>
          <p className="text-sm text-on-surface/55">Last Updated: {lastUpdated}</p>
          <nav className="mt-8 hidden space-y-2 md:block" aria-label={`${title} sections`}>
            {sections.map((section) => (
              <a
                key={section.title}
                href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                className="block text-sm text-on-surface/55 transition-colors hover:text-primary"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="max-w-[72ch]">
          <div className="mb-10">
            <h1 className="font-headline-lg text-4xl leading-tight text-on-surface md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-7 text-on-surface/70 md:text-lg">
              {intro}
            </p>
          </div>

          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.title}
                id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                className="scroll-mt-8 border-t border-white/10 pt-8"
              >
                <h2 className="font-headline-lg text-2xl text-on-surface">
                  {section.title}
                </h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-7 text-on-surface/70 md:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-on-surface/70 md:text-base">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
