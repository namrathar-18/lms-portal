import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/discussions")({
  head: () => ({ meta: [{ title: "Discussions — Lumen LMS" }] }),
  component: DiscussionsIndex,
});

function DiscussionsIndex() {
  const { user, isInstructor } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ["disc-courses", user?.id],
    queryFn: async () => {
      const enr = await supabase.from("enrollments").select("courses(id,title,description)");
      const teach = isInstructor
        ? await supabase.from("courses").select("id,title,description").eq("instructor_id", user!.id)
        : { data: [] as any };
      const map = new Map<string, any>();
      (enr.data ?? []).forEach((e: any) => e.courses && map.set(e.courses.id, e.courses));
      (teach.data ?? []).forEach((c: any) => map.set(c.id, c));
      return Array.from(map.values());
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Discussions</h1>
        <p className="text-sm text-muted-foreground">Class conversations across your courses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(courses ?? []).map((c: any) => (
          <Link key={c.id} to="/discussions/$courseId" params={{ courseId: c.id }}
            className="group rounded-2xl border bg-card p-5 transition hover:shadow-soft">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary">{c.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              </div>
            </div>
          </Link>
        ))}
        {courses && courses.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground md:col-span-2">
            Enroll in a course to start discussing.
          </div>
        )}
      </div>
    </div>
  );
}
