import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CourseCard } from "@/components/course-card";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Saved courses — Lumen LMS" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks" as any).select("course_id, courses(*)").eq("user_id", user!.id);
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Saved courses</h1>
        <p className="text-sm text-muted-foreground">Courses you've bookmarked for later.</p>
      </div>
      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">Bookmark courses from the catalog to find them here.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data!.map((b: any) => <CourseCard key={b.course_id} course={b.courses} />)}
        </div>
      )}
    </div>
  );
}
