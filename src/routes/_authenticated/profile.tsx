import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Lumen LMS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  const [form, setForm] = useState({ full_name: "", headline: "", bio: "", avatar_url: "" });
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", headline: profile.headline ?? "", bio: profile.bio ?? "", avatar_url: profile.avatar_url ?? "" });
  }, [profile]);

  async function save() {
    const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  const initials = (form.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground">Tell others a bit about yourself.</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
        <Avatar className="h-16 w-16">
          {form.avatar_url && <AvatarImage src={form.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{form.full_name || "Unnamed"}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
          <div className="mt-1 flex gap-1.5">
            {roles.map((r) => <span key={r} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{r}</span>)}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Headline"><Input placeholder="e.g. Frontend developer · Lifelong learner" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></Field>
        <Field label="Bio"><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
        <Field label="Avatar URL"><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /></Field>
        <div className="flex justify-end"><Button onClick={save}><Save className="mr-2 h-4 w-4" /> Save changes</Button></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
