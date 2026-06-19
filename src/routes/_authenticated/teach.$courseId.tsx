import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, GripVertical, FileText, ListChecks, Megaphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teach/$courseId")({
  head: () => ({ meta: [{ title: "Edit course — Lumen LMS" }] }),
  component: CourseEditor,
});

function CourseEditor() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["edit-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      return data;
    },
  });

  const togglePublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").update({ published: !course?.published }).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(course?.published ? "Unpublished" : "Published");
      qc.invalidateQueries({ queryKey: ["edit-course", courseId] });
    },
  });

  if (!course) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Link to="/teach" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {course.category && <Badge variant="secondary">{course.category}</Badge>}
              <Badge variant="outline">{course.level}</Badge>
              {course.published ? (
                <Badge className="bg-success text-success-foreground">Published</Badge>
              ) : (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{course.title}</h1>
            {course.description && <p className="mt-2 max-w-2xl text-muted-foreground">{course.description}</p>}
          </div>
          <Button variant={course.published ? "outline" : "default"} onClick={() => togglePublish.mutate()}>
            {course.published ? <><EyeOff className="mr-2 h-4 w-4" /> Unpublish</> : <><Eye className="mr-2 h-4 w-4" /> Publish</>}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content"><GripVertical className="mr-1.5 h-4 w-4" /> Content</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-1.5 h-4 w-4" /> Announcements</TabsTrigger>
          <TabsTrigger value="assignments"><FileText className="mr-1.5 h-4 w-4" /> Assignments</TabsTrigger>
          <TabsTrigger value="students"><Users className="mr-1.5 h-4 w-4" /> Students</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6"><ContentTab courseId={courseId} /></TabsContent>
        <TabsContent value="announcements" className="mt-6"><AnnouncementsTab courseId={courseId} /></TabsContent>
        <TabsContent value="assignments" className="mt-6"><AssignmentsTab courseId={courseId} /></TabsContent>
        <TabsContent value="students" className="mt-6"><StudentsTab courseId={courseId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ContentTab({ courseId }: { courseId: string }) {
  const qc = useQueryClient();

  const { data: modules } = useQuery({
    queryKey: ["edit-modules", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseId)
        .order("position");
      return (data ?? []).map((m: any) => ({ ...m, lessons: (m.lessons ?? []).sort((a: any, b: any) => a.position - b.position) }));
    },
  });

  const addModule = useMutation({
    mutationFn: async () => {
      const pos = (modules?.length ?? 0);
      const { error } = await supabase.from("modules").insert({ course_id: courseId, title: "New module", position: pos });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-modules", courseId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {(modules ?? []).map((m: any, mi: number) => (
        <ModuleEditor key={m.id} module={m} index={mi} courseId={courseId} />
      ))}
      <Button variant="outline" onClick={() => addModule.mutate()}><Plus className="mr-2 h-4 w-4" /> Add module</Button>
    </div>
  );
}

function ModuleEditor({ module: m, index, courseId }: { module: any; index: number; courseId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(m.title);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("modules").update({ title }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-modules", courseId] }),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("modules").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-modules", courseId] }),
  });
  const addLesson = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").insert({ module_id: m.id, title: "New lesson", position: m.lessons.length });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-modules", courseId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex items-center gap-3 border-b bg-surface px-5 py-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Module {index + 1}</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => update.mutate()} className="max-w-md" />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => del.mutate()}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <ul className="divide-y">
        {m.lessons.map((l: any) => (
          <LessonEditor key={l.id} lesson={l} courseId={courseId} />
        ))}
        {m.lessons.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No lessons yet.</li>}
      </ul>
      <div className="border-t p-3">
        <Button size="sm" variant="ghost" onClick={() => addLesson.mutate()}><Plus className="mr-2 h-4 w-4" /> Add lesson</Button>
      </div>
    </div>
  );
}

function LessonEditor({ lesson, courseId }: { lesson: any; courseId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [video, setVideo] = useState(lesson.video_url ?? "");
  const [content, setContent] = useState(lesson.content ?? "");
  const [duration, setDuration] = useState(lesson.duration_minutes ?? 0);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").update({ title, video_url: video || null, content: content || null, duration_minutes: duration }).eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["edit-modules", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-modules", courseId] }),
  });

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1 truncate text-sm">{lesson.title}</div>
      {lesson.duration_minutes ? <span className="text-xs text-muted-foreground">{lesson.duration_minutes}m</span> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" variant="outline">Edit</Button></DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div><Label>Video URL (YouTube or MP4)</Label><Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." /></div>
              <div><Label>Minutes</Label><Input type="number" min={0} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            </div>
            <div><Label>Content</Label><textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-48 w-full rounded-lg border bg-background p-3 text-sm" /></div>
            <QuizEditor lessonId={lesson.id} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => del.mutate()}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function QuizEditor({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const { data: quiz } = useQuery({
    queryKey: ["edit-quiz", lessonId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*, quiz_questions(*)").eq("lesson_id", lessonId).maybeSingle();
      if (data?.quiz_questions) data.quiz_questions.sort((a: any, b: any) => a.position - b.position);
      return data;
    },
  });

  const createQuiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quizzes").insert({ lesson_id: lessonId, title: "Lesson quiz", passing_score: 70 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-quiz", lessonId] }),
    onError: (e: any) => toast.error(e.message),
  });
  const deleteQuiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quizzes").delete().eq("id", quiz!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-quiz", lessonId] }),
  });
  const addQ = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: quiz!.id,
        question: "New question?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_index: 0,
        position: quiz!.quiz_questions?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-quiz", lessonId] }),
  });

  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4" /> Quiz</div>
        {!quiz ? (
          <Button size="sm" variant="outline" onClick={() => createQuiz.mutate()}>Add quiz</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => deleteQuiz.mutate()}><Trash2 className="h-4 w-4" /></Button>
        )}
      </div>
      {quiz && (
        <div className="mt-3 space-y-3">
          {quiz.quiz_questions?.map((q: any) => (
            <QuestionEditor key={q.id} q={q} lessonId={lessonId} />
          ))}
          <Button size="sm" variant="outline" onClick={() => addQ.mutate()}><Plus className="mr-2 h-4 w-4" /> Add question</Button>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ q, lessonId }: { q: any; lessonId: string }) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState(q.question);
  const [options, setOptions] = useState<string[]>(q.options as string[]);
  const [correct, setCorrect] = useState(q.correct_index);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quiz_questions").update({ question, options, correct_index: correct }).eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Question saved"); qc.invalidateQueries({ queryKey: ["edit-quiz", lessonId] }); },
  });
  const del = useMutation({
    mutationFn: async () => { await supabase.from("quiz_questions").delete().eq("id", q.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-quiz", lessonId] }),
  });

  return (
    <div className="rounded-lg border bg-card p-3">
      <Input value={question} onChange={(e) => setQuestion(e.target.value)} className="mb-2 font-medium" />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="accent-primary" />
            <Input value={opt} onChange={(e) => { const c = [...options]; c[i] = e.target.value; setOptions(c); }} className="flex-1" />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => del.mutate()}><Trash2 className="h-4 w-4" /></Button>
        <Button size="sm" onClick={() => save.mutate()}>Save</Button>
      </div>
    </div>
  );
}

function AnnouncementsTab({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["edit-announcements", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const create = useMutation({
    mutationFn: async (input: { title: string; body: string }) => {
      const { error } = await supabase.from("announcements").insert({ ...input, course_id: courseId, author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posted"); qc.invalidateQueries({ queryKey: ["edit-announcements", courseId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("announcements").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-announcements", courseId] }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({ title: String(fd.get("title")), body: String(fd.get("body")) });
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-card p-5 shadow-card">
        <Input name="title" placeholder="Announcement title" required maxLength={120} />
        <textarea name="body" placeholder="Share an update with your students..." required className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" />
        <div className="flex justify-end"><Button type="submit">Post announcement</Button></div>
      </form>
      {(data ?? []).map((a) => (
        <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">{a.title}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignmentsTab({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["edit-assignments", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*, assignment_submissions(*)").eq("course_id", courseId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const create = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase.from("assignments").insert({ ...input, course_id: courseId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment added"); qc.invalidateQueries({ queryKey: ["edit-assignments", courseId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("assignments").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edit-assignments", courseId] }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      title: fd.get("title"),
      description: fd.get("description"),
      points: Number(fd.get("points") || 100),
      due_date: fd.get("due_date") ? new Date(String(fd.get("due_date"))).toISOString() : null,
    });
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-2xl border bg-card p-5 shadow-card md:grid-cols-2">
        <Input name="title" placeholder="Assignment title" required />
        <div className="grid grid-cols-2 gap-3">
          <Input name="points" type="number" min={1} defaultValue={100} placeholder="Points" />
          <Input name="due_date" type="date" />
        </div>
        <textarea name="description" placeholder="Instructions..." className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm md:col-span-2" />
        <div className="flex justify-end md:col-span-2"><Button type="submit">Add assignment</Button></div>
      </form>
      {(data ?? []).map((a: any) => (
        <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold">{a.title}</h4>
              {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span>{a.points} pts</span>
                {a.due_date && <span>Due {new Date(a.due_date).toLocaleDateString()}</span>}
                <span>{a.assignment_submissions?.length ?? 0} submissions</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          {a.assignment_submissions?.length > 0 && (
            <div className="mt-4 space-y-2 border-t pt-3">
              {a.assignment_submissions.map((s: any) => (
                <SubmissionRow key={s.id} sub={s} maxPoints={a.points} courseId={courseId} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubmissionRow({ sub, maxPoints, courseId }: { sub: any; maxPoints: number; courseId: string }) {
  const qc = useQueryClient();
  const [grade, setGrade] = useState<number | "">(sub.grade ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignment_submissions").update({ grade: grade === "" ? null : Number(grade), feedback, graded_at: new Date().toISOString() }).eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Grade saved"); qc.invalidateQueries({ queryKey: ["edit-assignments", courseId] }); },
  });
  return (
    <div className="rounded-lg bg-surface p-3 text-sm">
      <div className="mb-2 text-xs text-muted-foreground">Student {sub.user_id.slice(0, 8)} · submitted {new Date(sub.submitted_at).toLocaleDateString()}</div>
      <p className="whitespace-pre-wrap">{sub.content}</p>
      <div className="mt-3 flex items-end gap-2">
        <div className="w-24"><Label className="text-xs">Grade</Label><Input type="number" min={0} max={maxPoints} value={grade} onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))} /></div>
        <div className="flex-1"><Label className="text-xs">Feedback</Label><Input value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
        <Button size="sm" onClick={() => save.mutate()}>Save</Button>
      </div>
    </div>
  );
}

function StudentsTab({ courseId }: { courseId: string }) {
  const { data } = useQuery({
    queryKey: ["course-students", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("*, profiles(full_name, avatar_url)").eq("course_id", courseId).order("enrolled_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="border-b px-5 py-3 text-sm font-semibold">{data?.length ?? 0} enrolled students</div>
      <ul className="divide-y">
        {(data ?? []).map((e: any) => (
          <li key={e.id} className="flex items-center gap-3 px-5 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(e.profiles?.full_name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{e.profiles?.full_name ?? "Student"}</div>
              <div className="text-xs text-muted-foreground">Enrolled {new Date(e.enrolled_at).toLocaleDateString()}</div>
            </div>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">No enrollments yet.</li>}
      </ul>
    </div>
  );
}
