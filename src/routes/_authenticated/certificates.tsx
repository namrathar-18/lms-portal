import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Lumen LMS" }] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["certs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates" as any)
        .select("*, courses(title), profiles!certificates_user_id_fkey(full_name)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">Recognition for courses you've completed.</p>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Award className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {data!.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Award className="h-6 w-6" /></div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Certificate of Completion</div>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{c.courses?.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
              <p className="mt-4 text-xs text-muted-foreground">Serial: <span className="font-mono">{c.serial}</span></p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
