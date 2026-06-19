import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ListChecks, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson — Lumen LMS" }] }),
  component: LessonPlayer,
});

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, modules(id, title, course_id, courses(id, title))")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const courseId = lesson?.modules?.course_id;

  const { data: outline } = useQuery({
    queryKey: ["course-outline", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("modules")
        .select("id, title, position, lessons(id, title, position)")
        .eq("course_id", courseId!)
        .order("position");
      return (data ?? []).map((m: any) => ({
        ...m,
        lessons: (m.lessons ?? []).sort((a: any, b: any) => a.position - b.position),
      }));
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress-all", user?.id, courseId],
    enabled: !!user && !!outline,
    queryFn: async () => {
      const ids = (outline ?? []).flatMap((m: any) => m.lessons.map((l: any) => l.id));
      if (!ids.length) return [];
      const { data } = await supabase.from("lesson_progress").select("lesson_id").in("lesson_id", ids);
      return data ?? [];
    },
  });

  const { data: quiz } = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("*, quiz_questions(*)")
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (data?.quiz_questions) {
        data.quiz_questions = data.quiz_questions.sort((a: any, b: any) => a.position - b.position);
      }
      return data;
    },
  });

  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id));

  const flatLessons = useMemo(
    () => (outline ?? []).flatMap((m: any) => m.lessons.map((l: any) => ({ ...l, moduleTitle: m.title }))),
    [outline]
  );
  const currentIdx = flatLessons.findIndex((l: any) => l.id === lessonId);
  const prev = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (completedSet.has(lessonId)) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lesson_progress")
          .insert({ lesson_id: lessonId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-progress-all"] });
      qc.invalidateQueries({ queryKey: ["my-progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pct = flatLessons.length ? Math.round((completedSet.size / flatLessons.length) * 100) : 0;

  if (!lesson) {
    return <div className="py-20 text-center text-muted-foreground">Loading lesson...</div>;
  }

  const isDone = completedSet.has(lessonId);

  // youtube embed helper
  const ytId = lesson.video_url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/)?.[1];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Link
          to="/courses/$courseId"
          params={{ courseId: courseId! }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{lesson.modules?.title}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        </div>

        {lesson.video_url && (
          <div className="overflow-hidden rounded-2xl border bg-black shadow-card">
            <div className="aspect-video">
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={lesson.video_url} controls className="h-full w-full" />
              )}
            </div>
          </div>
        )}

        {lesson.content && (
          <article className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
              {lesson.content}
            </div>
          </article>
        )}

        {quiz && quiz.quiz_questions?.length > 0 && (
          <QuizCard quiz={quiz} />
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={!prev}
            onClick={() => prev && navigate({ to: "/learn/$lessonId", params: { lessonId: prev.id } })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Previous
          </Button>
          <Button
            variant={isDone ? "outline" : "default"}
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {isDone ? (
              <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Completed</>
            ) : (
              <>Mark complete</>
            )}
          </Button>
          <Button
            disabled={!next}
            onClick={() => next && navigate({ to: "/learn/$lessonId", params: { lessonId: next.id } })}
          >
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="text-sm text-muted-foreground">Course progress</div>
          <div className="mt-1 text-2xl font-semibold">{pct}%</div>
          <Progress value={pct} className="mt-2 h-1.5" />
        </div>

        <div className="rounded-2xl border bg-card shadow-card">
          <div className="border-b px-5 py-3 text-sm font-semibold">Course outline</div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {(outline ?? []).map((m: any) => (
              <div key={m.id} className="mb-2">
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.title}
                </div>
                <ul>
                  {m.lessons.map((l: any) => {
                    const done = completedSet.has(l.id);
                    const active = l.id === lessonId;
                    return (
                      <li key={l.id}>
                        <Link
                          to="/learn/$lessonId"
                          params={{ lessonId: l.id }}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-primary/10 text-foreground" : "hover:bg-secondary"}`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : active ? (
                            <Play className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: any }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<{ score: number; passed: boolean } | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      let correct = 0;
      quiz.quiz_questions.forEach((q: any) => {
        if (answers[q.id] === q.correct_index) correct++;
      });
      const score = Math.round((correct / quiz.quiz_questions.length) * 100);
      const passed = score >= quiz.passing_score;
      const { error } = await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: user!.id,
        score,
        answers,
        passed,
      });
      if (error) throw error;
      return { score, passed };
    },
    onSuccess: (r) => {
      setSubmitted(r);
      r.passed ? toast.success(`Passed with ${r.score}%`) : toast.error(`Scored ${r.score}% — passing is ${quiz.passing_score}%`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ListChecks className="h-4 w-4" /> Quiz
      </div>
      <h3 className="mt-1 text-xl font-semibold">{quiz.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Passing score: {quiz.passing_score}%</p>

      <div className="mt-6 space-y-6">
        {quiz.quiz_questions.map((q: any, qi: number) => (
          <div key={q.id}>
            <div className="font-medium">{qi + 1}. {q.question}</div>
            <div className="mt-3 space-y-2">
              {(q.options as string[]).map((opt, i) => {
                const selected = answers[q.id] === i;
                const isCorrect = submitted && q.correct_index === i;
                const isWrong = submitted && selected && q.correct_index !== i;
                return (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                      isCorrect ? "border-success bg-success/10" :
                      isWrong ? "border-destructive bg-destructive/10" :
                      selected ? "border-primary bg-primary/5" : "hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      disabled={!!submitted}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                      className="accent-primary"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {submitted ? (
          <>
            <div className="text-sm">
              You scored <span className="font-semibold">{submitted.score}%</span> — {submitted.passed ? <span className="text-success">passed</span> : <span className="text-destructive">try again</span>}
            </div>
            <Button variant="outline" onClick={() => { setSubmitted(null); setAnswers({}); }}>Retake</Button>
          </>
        ) : (
          <Button
            disabled={Object.keys(answers).length !== quiz.quiz_questions.length || submit.isPending}
            onClick={() => submit.mutate()}
          >
            Submit answers
          </Button>
        )}
      </div>
    </div>
  );
}
