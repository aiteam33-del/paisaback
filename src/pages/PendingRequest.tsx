import { useEffect, useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PendingRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    document.title = "Request Sent – PAISABACK";
  }, []);

  // Load request + profile details
  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.organization_id) {
        navigate('/employee');
        return;
      }

      setFullName(profile?.full_name || "");
      setEmail(profile?.email || user.email || "");

      const { data: jr } = await supabase
        .from("join_requests")
        .select("org_id, created_at, status")
        .eq("employee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jr?.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", jr.org_id)
          .maybeSingle();
        setOrgName(org?.name || "");
      }
    };
    load();
  }, [user, navigate]);

  // Realtime + polling to auto-redirect when approved
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-approval-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => {
          const orgId = (payload.new && (payload.new as any).organization_id) || null;
          if (orgId) {
            toast.success('You have been approved. Welcome!');
            navigate('/employee');
          }
        }
      )
      .subscribe();

    const timer = setInterval(async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.organization_id) {
        clearInterval(timer);
        try { supabase.removeChannel(channel); } catch (_) {}
        navigate('/employee');
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <Card className="shadow-card text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Request Sent</CardTitle>
            <CardDescription>
              {orgName ? `Your request to join ${orgName} has been sent.` : "Your join request has been sent."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-muted-foreground font-medium">
                {fullName || email}
              </p>
              <p className="text-muted-foreground">{email}</p>
            </div>
            <p className="text-muted-foreground">
              We've notified your organization admin. You'll be onboarded automatically once they approve.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/onboarding")}>Change Organization</Button>
              <Button onClick={() => navigate("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PendingRequest;
