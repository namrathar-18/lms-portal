import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, LineChart, Megaphone, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen LMS — A focused space to learn and teach" },
      { name: "description", content: "Courses, lessons, quizzes, assignments, and progress tracking in one clean workspace." },
      { property: "og:title", content: "Lumen LMS" },
      { property: "og:description", content: "A focused workspace for modern learning." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-10 top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for modern classrooms
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              A focused workspace to <span className="text-primary">learn</span> and <span className="text-primary">teach</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              Lumen brings courses, lessons, quizzes, assignments, and progress into one calm,
              clean interface — for learners and instructors who care about craft.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate({ to: "/auth" })}>
                Start learning <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">I'm an instructor</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: BookOpen, title: "Rich courses", desc: "Organize lessons in modules with video, text, and resources." },
              { icon: ClipboardCheck, title: "Quizzes & assignments", desc: "Auto-graded quizzes plus submissions with instructor feedback." },
              { icon: LineChart, title: "Progress tracking", desc: "Per-lesson completion and course progress at a glance." },
              { icon: Megaphone, title: "Announcements", desc: "Classroom-style updates keep cohorts in sync." },
              { icon: Users, title: "Roles built in", desc: "Students and instructors get the right tools by default." },
              { icon: GraduationCap, title: "Made for teaching", desc: "A teaching dashboard with everything you need to ship." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card transition hover:shadow-soft">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Lumen LMS · Crafted with care
      </footer>
    </div>
  );
}
