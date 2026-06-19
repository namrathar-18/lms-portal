import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lumen LMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isInstructor } = useAuth();

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, courses(*)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["my-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, lessons(module_id, modules(course_id))");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function becomeInstructor() {
    const { error } = await supabase.rpc("become_instructor");
    if (error) return toast.error(error.message);
    toast.success("You're an instructor now — refreshing...");
    setTimeout(() => window.location.reload(), 700);
  }

  // compute progress per course
  const courseProgress: Record<string, { done: number }> = {};
  (progressData ?? []).forEach((p: any) => {
    const courseId = p.lessons?.modules?.course_id;
    if (!courseId) return;
    courseProgress[courseId] = { done: (courseProgress[courseId]?.done ?? 0) + 1 };
  });

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-3xl font-semibold tracking-tight">{name} 👋</h1>
          </div>
          {!isInstructor && (
            <Button variant="outline" onClick={becomeInstructor}>
              <Sparkles className="mr-2 h-4 w-4" /> Become an instructor
            </Button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={BookOpen} label="Enrolled courses" value={enrollments?.length ?? 0} />
          <StatCard icon={ClipboardList} label="Lessons completed" value={progressData?.length ?? 0} />
          <StatCard icon={TrendingUp} label="Active streak" value={`${Math.min(7, progressData?.length ?? 0)} days`} />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Continue learning</h2>
          <Link to="/courses" className="text-sm font-medium text-primary hover:underline">Browse catalog →</Link>
        </div>
        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e: any) => (
              <CourseCard
                key={e.course_id}
                course={e.courses}
                progress={Math.min(100, (courseProgress[e.course_id]?.done ?? 0) * 20)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-3 font-semibold">You're not enrolled in anything yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Browse the catalog and join a course to get started.</p>
            <Button asChild className="mt-5"><Link to="/courses">Explore courses</Link></Button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Newly published</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(featured ?? []).map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
          {featured && featured.length === 0 && (
            <p className="text-sm text-muted-foreground">No published courses yet. {isInstructor ? "Create the first one!" : ""}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
