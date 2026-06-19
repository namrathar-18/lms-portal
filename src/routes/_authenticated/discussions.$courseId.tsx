import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/discussions/$courseId")({
  component: CourseDiscussions,
});

function CourseDiscussions() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => (await supabase.from("courses").select("title").eq("id", courseId).single()).data,
  });

  const { data: discussions } = useQuery({
    queryKey: ["discussions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussions" as any)
        .select("*, profiles!discussions_author_id_fkey(full_name, avatar_url)")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) {
        const fallback = await supabase.from("discussions" as any).select("*").eq("course_id", courseId).order("created_at", { ascending: false });
        return (fallback.data ?? []) as any[];
      }
      return (data ?? []) as any[];
    },
  });

  const { data: replies } = useQuery({
    queryKey: ["replies", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("discussion_replies" as any)
        .select("*")
        .eq("discussion_id", activeId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  async function post() {
    if (!title || !body) return toast.error("Fill title and body");
    const { error } = await supabase.from("discussions" as any).insert({ course_id: courseId, author_id: user!.id, title, body });
    if (error) return toast.error(error.message);
    setTitle(""); setBody("");
    qc.invalidateQueries({ queryKey: ["discussions", courseId] });
  }

  async function sendReply() {
    if (!reply || !activeId) return;
    const { error } = await supabase.from("discussion_replies" as any).insert({ discussion_id: activeId, author_id: user!.id, body: reply });
    if (error) return toast.error(error.message);
    setReply("");
    qc.invalidateQueries({ queryKey: ["replies", activeId] });
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/discussions"><ArrowLeft className="mr-1.5 h-4 w-4" /> All discussions</Link></Button>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{course?.title}</h1>
        <p className="text-sm text-muted-foreground">Course discussion board</p>
      </div>

      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <Input placeholder="Topic title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Start a discussion..." rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end"><Button onClick={post}><Send className="mr-2 h-4 w-4" /> Post</Button></div>
      </div>

      <div className="space-y-3">
        {(discussions ?? []).map((d: any) => {
          const open = activeId === d.id;
          const initials = (d.profiles?.full_name ?? "U").slice(0, 2).toUpperCase();
          return (
            <div key={d.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{d.title}</h3>
                  <p className="text-xs text-muted-foreground">{d.profiles?.full_name ?? "Member"} · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{d.body}</p>
                  <button onClick={() => setActiveId(open ? null : d.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" /> {open ? "Hide replies" : "View / reply"}
                  </button>

                  {open && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {(replies ?? []).map((r: any) => (
                        <div key={r.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                          <p className="whitespace-pre-wrap">{r.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input placeholder="Write a reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
                        <Button onClick={sendReply}>Reply</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {discussions && discussions.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">No discussions yet. Start one above.</div>
        )}
      </div>
    </div>
  );
}
