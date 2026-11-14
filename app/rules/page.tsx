import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Official Rules",
  description: "Official rules for The Scavenger NYC weekly coin hunts.",
};

const SUPPORT_EMAIL = "support@scavengercoin.com";

const RULES = [
  { title: "No purchase necessary.", body: "The hunt is free to enter. Buying anything does not improve your chances." },
  { title: "One prize per hunt.", body: "It goes to the first valid claim of that hunt's coin." },
  { title: "The prize is SCAV tokens.", body: "SCAV has no guaranteed cash value." },
  { title: "Who can enter.", body: "Open to legal residents who are 18 or older. Void where prohibited." },
  {
    title: "Hunt safely and respectfully.",
    body: "Follow park rules. No digging, no climbing, and no entering restricted areas.",
  },
  {
    title: "Changes.",
    body: "We may end or modify a hunt for safety or technical reasons.",
  },
] as const;

export default function RulesPage() {
  return (
    <main className="flex-1 bg-bg text-ink">
      <header className="border-b border-line bg-gradient-to-b from-surface to-bg px-6 pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h1 className="font-display text-5xl leading-none sm:text-7xl">OFFICIAL RULES</h1>
          <p className="text-balance text-sm text-ink/60 sm:text-base">
            The short version of how The Scavenger NYC coin hunts work.
          </p>
          <Link
            href="/"
            className="text-xs font-medium tracking-widest text-ink/60 transition hover:text-accent"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <ol className="flex flex-col gap-3">
          {RULES.map((rule, i) => (
            <li key={rule.title} className="flex gap-4 rounded-xl border border-line bg-surface px-5 py-4">
              <span aria-hidden className="font-display text-2xl leading-none text-accent">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-ink/70">
                <span className="font-semibold text-ink">{rule.title}</span> {rule.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-ink/70">
          Questions? Contact{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-accent underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
