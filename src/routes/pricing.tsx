import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lumen LMS" },
      { name: "description", content: "Simple pricing for individual instructors, schools, and organizations." },
      { property: "og:title", content: "Lumen LMS — Pricing" },
      { property: "og:description", content: "Free for learners. Simple plans for instructors and schools." },
    ],
  }),
  component: Pricing,
});

const tiers = [
  { name: "Learner", price: "Free", desc: "For students taking courses.", features: ["Unlimited enrollment", "Progress tracking", "Discussions", "Certificates"], cta: "Get started" },
  { name: "Instructor", price: "$19", suffix: "/mo", desc: "For independent teachers.", features: ["Up to 10 courses", "Quizzes & assignments", "Announcements & calendar", "Email support"], cta: "Start teaching", highlight: true },
  { name: "School", price: "Custom", desc: "For institutions.", features: ["Unlimited courses & seats", "SSO & roles", "Priority support", "Custom domain"], cta: "Contact us" },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">Simple, honest pricing.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Pay only for what you teach. Learners always free.</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border bg-card p-6 ${t.highlight ? "border-primary shadow-soft ring-1 ring-primary/20" : ""}`}>
              {t.highlight && <div className="mb-3 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Most popular</div>}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">{t.price}</span>
                {t.suffix && <span className="text-sm text-muted-foreground">{t.suffix}</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={t.highlight ? "default" : "outline"}>
                <Link to="/auth">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
