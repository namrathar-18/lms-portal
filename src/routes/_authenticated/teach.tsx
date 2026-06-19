import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teach")({
  head: () => ({ meta: [{ title: "Teach — Lumen LMS" }] }),
  component: TeachDashboard,
});

function TeachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["my-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, enrollments(count)")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createCourse = useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({ ...input, instructor_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (c) => {
      toast.success("Course created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      navigate({ to: "/teach/$courseId", params: { courseId: c.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCourse.mutate({
      title: fd.get("title"),
      description: fd.get("description"),
      category: fd.get("category"),
      level: fd.get("level"),
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your courses</h1>
          <p className="mt-1 text-muted-foreground">Manage everything you teach in one place.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a course</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea id="description" name="description" maxLength={500} className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" placeholder="e.g. Design" />
                </div>
                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select name="level" defaultValue="Beginner">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCourse.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c: any) => (
            <CourseCard key={c.id} course={c} to="teach" meta={{ lessons: c.enrollments?.[0]?.count ?? 0 }} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <h3 className="font-semibold">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first course to start teaching.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New course</Button>
        </div>
      )}
    </div>
  );
}
