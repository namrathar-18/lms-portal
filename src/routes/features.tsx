import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LineChart, Megaphone, MessagesSquare, Award, Bookmark, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Lumen LMS" },
      { name: "description", content: "Everything you need to run modern courses: lessons, quizzes, assignments, discussions, calendar, certificates." },
      { property: "og:title", content: "Lumen LMS — Features" },
      { property: "og:description", content: "All the LMS essentials, in one calm workspace." },
    ],
  }),
  component: Features,
});

const features = [
  { icon: BookOpen, title: "Courses & lessons", desc: "Organize modules with video, text, and resources. Drag-friendly authoring." },
  { icon: ClipboardCheck, title: "Auto-graded quizzes", desc: "Multiple-choice quizzes attached to lessons with passing scores." },
  { icon: GraduationCap, title: "Assignments", desc: "Collect submissions, leave feedback, and grade with scoring." },
  { icon: LineChart, title: "Progress tracking", desc: "Per-lesson completion, course progress, and learning streaks." },
  { icon: Megaphone, title: "Announcements", desc: "Classroom-style updates broadcast to all enrolled students." },
  { icon: MessagesSquare, title: "Discussions", desc: "A forum per course for questions, debates, and study groups." },
  { icon: CalendarDays, title: "Calendar", desc: "Schedule live classes, office hours, and deadlines." },
  { icon: Award, title: "Certificates", desc: "Issue completion certificates with unique serials." },
  { icon: Bookmark, title: "Saved courses", desc: "Bookmark what catches your eye to revisit later." },
  { icon: Users, title: "Roles built in", desc: "Students and instructors with the right tools by default." },
];

function Features() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">Everything you need to teach and learn.</h1>
          <p className="mt-4 text-lg text-muted-foreground">A complete LMS toolkit — without the bloat.</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card transition hover:shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button asChild size="lg"><Link to="/auth">Try Lumen free</Link></Button>
        </div>
      </section>
    </div>
  );
}
