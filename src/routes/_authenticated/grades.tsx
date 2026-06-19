import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/grades")({
  head: () => ({ meta: [{ title: "Grades — Lumen LMS" }] }),
  component: GradesPage,
});

function GradesPage() {
  const { user } = useAuth();

  const { data: quizAttempts } = useQuery({
    queryKey: ["my-quiz-attempts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("*, quizzes(title, lesson_id, passing_score)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["my-submissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, max_score)")
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });

  const avg = (() => {
    const items = (quizAttempts ?? []).map((q: any) => q.score).filter((v: any) => typeof v === "number");
    if (items.length === 0) return null;
    return Math.round(items.reduce((a: number, b: number) => a + b, 0) / items.length);
  })();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Grades</h1>
        <p className="text-sm text-muted-foreground">Quiz results and assignment feedback in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Quizzes taken" value={quizAttempts?.length ?? 0} />
        <Stat label="Average quiz score" value={avg !== null ? `${avg}%` : "—"} />
        <Stat label="Assignments submitted" value={submissions?.length ?? 0} />
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Award className="h-5 w-5 text-primary" /> Quiz results</h2>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr>
            </thead>
            <tbody>
              {(quizAttempts ?? []).map((a: any) => {
                const passed = a.score >= (a.quizzes?.passing_score ?? 70);
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{a.quizzes?.title}</td>
                    <td className="px-4 py-3">{a.score}%</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${passed ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                        {passed ? "Passed" : "Below pass"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {quizAttempts?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No quiz attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-primary" /> Assignments</h2>
        <div className="space-y-3">
          {(submissions ?? []).map((s: any) => (
            <div key={s.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{s.assignments?.title}</div>
                  <div className="text-xs text-muted-foreground">Submitted {new Date(s.submitted_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold">{s.score ?? "—"}<span className="text-sm text-muted-foreground">/{s.assignments?.max_score ?? 100}</span></div>
                  <div className="text-xs text-muted-foreground">{s.score == null ? "Awaiting grade" : "Graded"}</div>
                </div>
              </div>
              {s.feedback && <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm">{s.feedback}</p>}
            </div>
          ))}
          {submissions?.length === 0 && <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No submissions yet.</div>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
