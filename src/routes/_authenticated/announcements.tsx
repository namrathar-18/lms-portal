import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Lumen LMS" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user, isInstructor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["my-courses-for-ann"],
    queryFn: async () => {
      const enrollments = await supabase.from("enrollments").select("course_id, courses(id,title)");
      const teaching = isInstructor
        ? await supabase.from("courses").select("id,title").eq("instructor_id", user!.id)
        : { data: [] as any };
      const map = new Map<string, { id: string; title: string }>();
      (enrollments.data ?? []).forEach((e: any) => e.courses && map.set(e.courses.id, e.courses));
      (teaching.data ?? []).forEach((c: any) => map.set(c.id, c));
      return Array.from(map.values());
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, courses(title)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function post() {
    if (!courseId || !title || !body) return toast.error("Fill all fields");
    const { error } = await supabase.from("announcements").insert({
      course_id: courseId,
      author_id: user!.id,
      title,
      body,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    setOpen(false);
    setTitle(""); setBody(""); setCourseId("");
    qc.invalidateQueries({ queryKey: ["announcements-feed"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Updates from courses you teach and learn in.</p>
        </div>
        {isInstructor && (
          <Button onClick={() => setOpen((v) => !v)}>
            <Megaphone className="mr-2 h-4 w-4" /> New announcement
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              {(courses ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Write your announcement..." rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={post}><Send className="mr-2 h-4 w-4" /> Post</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(announcements ?? []).map((a: any) => (
          <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-primary">{a.courses?.title}</div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
            </div>
            <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
          </div>
        ))}
        {announcements && announcements.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No announcements yet.
          </div>
        )}
      </div>
    </div>
  );
}
