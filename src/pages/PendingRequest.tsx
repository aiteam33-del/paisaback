import { useEffect, useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PendingRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    document.title = "Request Sent – PAISABACK";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // Load profile for name/email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(profile?.full_name || "");
      setEmail(profile?.email || user.email || "");

      // Find the latest pending request and its organization
      const { data: jr } = await supabase
        .from("join_requests")
        .select("org_id, created_at")
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
  }, [user]);

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
              <p className="text-muted-foreground">
                {fullName ? `${fullName}` : ""}
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
