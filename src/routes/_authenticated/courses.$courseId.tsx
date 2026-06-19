import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, Clock, FileText, Megaphone, Play, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({ meta: [{ title: "Course — Lumen LMS" }] }),
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("content");

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*, profiles!courses_instructor_id_fkey(full_name)").eq("id", courseId).maybeSingle();
      if (error) {
        // fallback when fk join name differs
        const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
        return c;
      }
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        lessons: (m.lessons ?? []).sort((a: any, b: any) => a.position - b.position),
      }));
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    queryFn: async () => {
      const allLessonIds = (modules ?? []).flatMap((m: any) => m.lessons.map((l: any) => l.id));
      if (!allLessonIds.length) return [];
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .in("lesson_id", allLessonIds);
      return data ?? [];
    },
    enabled: !!modules && !!user,
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*, assignment_submissions(*)")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({ course_id: courseId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolled!");
      qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id));
  const totalLessons = (modules ?? []).reduce((acc, m: any) => acc + m.lessons.length, 0);
  const completedCount = completedSet.size;
  const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const firstLesson = modules?.[0]?.lessons?.[0];

  if (!course) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          <div className="p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              {course.category && <Badge variant="secondary">{course.category}</Badge>}
              <Badge variant="outline">{course.level}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{course.description}</p>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {totalLessons} lessons</span>
              <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {assignments?.length ?? 0} assignments</span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {!enrollment ? (
                <Button size="lg" onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                  Enroll in course
                </Button>
              ) : firstLesson ? (
                <Button size="lg" onClick={() => navigate({ to: "/learn/$lessonId", params: { lessonId: firstLesson.id } })}>
                  <Play className="mr-2 h-4 w-4" /> Continue learning
                </Button>
              ) : (
                <Button size="lg" disabled>No lessons yet</Button>
              )}
            </div>
          </div>

          <div className="bg-surface p-8 md:p-10">
            <div className="text-sm font-medium text-muted-foreground">Your progress</div>
            <div className="mt-2 text-3xl font-semibold">{pct}%</div>
            <Progress value={pct} className="mt-3 h-2" />
            <div className="mt-2 text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons complete</div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="mr-1.5 h-4 w-4" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <FileText className="mr-1.5 h-4 w-4" /> Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6 space-y-4">
          {modules && modules.length > 0 ? (
            modules.map((m: any, mi: number) => (
              <div key={m.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <div className="border-b bg-surface px-5 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Module {mi + 1}</div>
                  <h3 className="mt-0.5 text-lg font-semibold">{m.title}</h3>
                </div>
                <ul className="divide-y">
                  {m.lessons.map((l: any) => {
                    const done = completedSet.has(l.id);
                    return (
                      <li key={l.id}>
                        <Link
                          to="/learn/$lessonId"
                          params={{ lessonId: l.id }}
                          className="group flex items-center gap-4 px-5 py-4 transition hover:bg-secondary/50"
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                          ) : (
                            <div className="h-5 w-5 shrink-0 rounded-full border-2" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{l.title}</div>
                            {l.duration_minutes ? (
                              <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {l.duration_minutes} min
                              </div>
                            ) : null}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    );
                  })}
                  {m.lessons.length === 0 && (
                    <li className="px-5 py-6 text-sm text-muted-foreground">No lessons in this module yet.</li>
                  )}
                </ul>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
              The instructor hasn't added content yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-6 space-y-3">
          {(announcements ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
              No announcements yet.
            </div>
          ) : (
            announcements!.map((a) => (
              <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-card">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Megaphone className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </div>
                <h4 className="mt-1 font-semibold">{a.title}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-6 space-y-3">
          {(assignments ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
              No assignments yet.
            </div>
          ) : (
            assignments!.map((a: any) => {
              const mySub = a.assignment_submissions?.find((s: any) => s.user_id === user?.id);
              return (
                <AssignmentRow key={a.id} assignment={a} submission={mySub} />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentRow({ assignment, submission }: { assignment: any; submission: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(submission?.content ?? "");

  const submit = useMutation({
    mutationFn: async () => {
      if (submission) {
        const { error } = await supabase
          .from("assignment_submissions")
          .update({ content, submitted_at: new Date().toISOString() })
          .eq("id", submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assignment_submissions")
          .insert({ assignment_id: assignment.id, user_id: user!.id, content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Submitted!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["assignments", assignment.course_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold">{assignment.title}</h4>
          {assignment.description && <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{assignment.points} points</span>
            {assignment.due_date && <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>}
            {submission?.grade != null && (
              <Badge className="bg-success text-success-foreground">Graded: {submission.grade}/{assignment.points}</Badge>
            )}
            {submission && submission.grade == null && <Badge variant="outline">Submitted</Badge>}
          </div>
          {submission?.feedback && (
            <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
              <div className="font-medium">Instructor feedback</div>
              <p className="mt-1 text-muted-foreground">{submission.feedback}</p>
            </div>
          )}
        </div>
        <Button size="sm" variant={submission ? "outline" : "default"} onClick={() => setOpen(!open)}>
          {submission ? "Edit" : "Submit"}
        </Button>
      </div>
      {open && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your submission..."
            className="min-h-32 w-full rounded-lg border bg-background p-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => submit.mutate()} disabled={!content.trim() || submit.isPending}>Save submission</Button>
          </div>
        </div>
      )}
    </div>
  );
}
