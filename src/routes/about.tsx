import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Heart, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Lumen LMS" },
      { name: "description", content: "Lumen is a focused learning platform for educators and learners who care about craft." },
      { property: "og:title", content: "About Lumen LMS" },
      { property: "og:description", content: "Built for modern classrooms — calm, focused, and powerful." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-3xl px-4 py-20 md:px-8">
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">Learning, distilled.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Lumen is a calm, modern learning platform built for instructors and students who care about the craft of teaching and learning.
          We blend the best of Google Classroom's simplicity with the depth of Moodle, without the clutter.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            { icon: Heart, title: "Made with care", desc: "Every screen is designed to keep you in flow, not in menus." },
            { icon: Sparkles, title: "Powerful, not bloated", desc: "Courses, quizzes, assignments, discussions, certificates — only what you need." },
            { icon: Users, title: "Two-sided by design", desc: "Roles built in so students and instructors get the right tools by default." },
            { icon: GraduationCap, title: "Built for outcomes", desc: "Progress tracking and certificates give learning a clear arc." },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><v.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Button asChild size="lg"><Link to="/auth">Get started — it's free</Link></Button>
        </div>
      </section>
    </div>
  );
}
