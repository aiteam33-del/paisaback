import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, Mail, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function PendingRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requestStatus, setRequestStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkStatus = async () => {
      const { data, error } = await supabase
        .from("join_requests")
        .select(`
          status,
          organizations (
            name,
            admin_user_id,
            profiles:profiles!organizations_admin_user_id_fkey (email)
          )
        `)
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking status:", error);
        toast.error("Failed to check request status");
        return;
      }

      if (data) {
        setRequestStatus(data.status);
        const orgData = data.organizations as any;
        setOrgName(orgData?.name || "");
        setAdminEmail(orgData?.profiles?.email || "");
        
        if (data.status === "approved") {
          toast.success("Your request has been approved!");
          navigate("/employee");
        } else if (data.status === "rejected") {
          toast.error("Your request was rejected");
          navigate("/rejected-request");
        }
      }
      setLoading(false);
    };

    checkStatus();

    // Set up real-time subscription only (removed redundant polling)
    const subscription = supabase
      .channel('join_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'join_requests',
          filter: `employee_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Join request updated:', payload);
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const handleContactAdmin = () => {
    if (adminEmail) {
      window.location.href = `mailto:${adminEmail}?subject=Join Request Follow-up`;
    } else {
      toast.error("Admin contact information not available");
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from("join_requests")
      .delete()
      .eq("employee_id", user.id)
      .eq("status", "pending");
    
    if (error) {
      toast.error("Failed to cancel request");
      return;
    }
    
    toast.success("Request cancelled");
    navigate("/onboarding");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Checking your request status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Request Under Review</CardTitle>
          <CardDescription className="text-base">
            Your join request to <span className="font-semibold text-foreground">{orgName || "the organization"}</span> is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Sent</span>
              <span>Reviewing</span>
              <span>Approved</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>

          {/* Status Steps */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Request Submitted</p>
                <p className="text-xs text-muted-foreground">Your application has been sent</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-medium text-sm">Under Review</p>
                <p className="text-xs text-muted-foreground">Admin is reviewing your request</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 opacity-40">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Approved</p>
                <p className="text-xs text-muted-foreground">You'll receive access</p>
              </div>
            </div>
          </div>

          {/* Admin Contact */}
          {adminEmail && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <p className="text-sm font-medium">Need to follow up?</p>
              <p className="text-xs text-muted-foreground">
                Contact the admin at: <span className="font-mono">{adminEmail}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {adminEmail && (
              <Button 
                onClick={handleContactAdmin} 
                variant="default" 
                className="w-full"
                size="lg"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Admin
              </Button>
            )}
            
            <Button 
              onClick={handleCancelRequest} 
              variant="outline" 
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Request
            </Button>

            <Button 
              onClick={() => navigate("/")} 
              variant="ghost" 
              className="w-full"
            >
              Back to Home
            </Button>
          </div>

          {/* Help Section */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Approval typically takes 1-2 business days.{" "}
              <a href="#" className="underline hover:text-primary">
                Learn more
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}