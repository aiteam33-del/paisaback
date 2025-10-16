import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function RejectedRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadRejectionDetails = async () => {
      const { data, error } = await supabase
        .from("join_requests")
        .select(`
          rejection_reason,
          organizations (name)
        `)
        .eq("employee_id", user.id)
        .eq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading rejection details:", error);
        toast.error("Failed to load rejection details");
        return;
      }

      if (data) {
        setRejectionReason(data.rejection_reason || "No reason provided");
        setOrganizationName((data.organizations as any)?.name || "the organization");
      }
      setLoading(false);
    };

    loadRejectionDetails();
  }, [user, navigate]);

  const handleApplyToNew = () => {
    navigate("/onboarding");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@paisaback.com?subject=Rejected Join Request Help";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Request Rejected</CardTitle>
          <CardDescription>
            Your join request to {organizationName} was not approved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rejectionReason && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-2">Reason from Admin:</p>
              <p className="text-sm text-muted-foreground">{rejectionReason}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleApplyToNew} 
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Apply to Different Organization
            </Button>

            <Button 
              onClick={handleContactSupport} 
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Need help? Check our{" "}
              <a href="#" className="underline hover:text-primary">
                FAQ
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}