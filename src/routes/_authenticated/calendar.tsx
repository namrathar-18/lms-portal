import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Plus, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isAfter } from "date-fns";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Lumen LMS" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { user, isInstructor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ course_id: "", title: "", description: "", event_type: "live_class", starts_at: "", location_url: "" });

  const { data: courses } = useQuery({
    queryKey: ["teach-courses-cal", user?.id],
    enabled: !!user && isInstructor,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title").eq("instructor_id", user!.id);
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events" as any)
        .select("*, courses(title)")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upcoming = (events ?? []).filter((e) => isAfter(new Date(e.starts_at), new Date()));
  const past = (events ?? []).filter((e) => !isAfter(new Date(e.starts_at), new Date()));

  async function create() {
    if (!form.course_id || !form.title || !form.starts_at) return toast.error("Fill required fields");
    const { error } = await supabase.from("calendar_events" as any).insert({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Event added");
    setOpen(false);
    setForm({ course_id: "", title: "", description: "", event_type: "live_class", starts_at: "", location_url: "" });
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Live classes, deadlines, and course events.</p>
        </div>
        {isInstructor && (
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New event
          </Button>
        )}
      </div>

      {open && (
        <div className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              {(courses ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live_class">Live class</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="office_hours">Office hours</SelectItem>
              <SelectItem value="event">Event</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Meeting link (optional)" value={form.location_url} onChange={(e) => setForm({ ...form, location_url: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create event</Button>
          </div>
        </div>
      )}

      <Section title="Upcoming" events={upcoming} />
      <Section title="Past" events={past} muted />
    </div>
  );
}

function Section({ title, events, muted }: { title: string; events: any[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing here.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className={`flex items-center gap-4 rounded-2xl border bg-card p-4 ${muted ? "opacity-70" : ""}`}>
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase">{format(new Date(e.starts_at), "MMM")}</div>
                  <div className="text-xl font-bold leading-none">{format(new Date(e.starts_at), "d")}</div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{e.title}</h3>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{e.event_type.replace("_", " ")}</span>
                </div>
                <div className="text-xs text-muted-foreground">{e.courses?.title} · {format(new Date(e.starts_at), "PPp")}</div>
                {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
              </div>
              {e.location_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={e.location_url} target="_blank" rel="noreferrer"><Video className="mr-2 h-4 w-4" /> Join</a>
                </Button>
              )}
              {!e.location_url && <CalendarDays className="h-5 w-5 text-muted-foreground" />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
