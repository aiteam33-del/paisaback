import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Mail, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

interface JoinRequest {
  id: string;
  employee_id: string;
  org_id: string;
  status: string;
  created_at: string;
  employee: {
    full_name: string;
    email: string;
  };
}

const AdminJoinRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadJoinRequests();
  }, [user, navigate]);

  // Scroll to specific request if coming from notification
  useEffect(() => {
    const jrId = searchParams.get('joinRequestId');
    if (jrId) {
      setTimeout(() => {
        const el = document.getElementById(`jr-${jrId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000);
        }
      }, 100);
    }
  }, [searchParams, joinRequests]);

  const loadJoinRequests = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get organization
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("admin_user_id", user.id)
        .single();

      if (orgData) {
        // Get pending join requests
        const { data: joinRequestsData, error: jrError } = await supabase
          .from("join_requests")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (jrError) {
          console.error("Error loading join requests:", jrError);
        }

        if (joinRequestsData && joinRequestsData.length > 0) {
          // Fetch employee profiles
          const employeeIds = joinRequestsData.map(req => req.employee_id);
          const { data: employeeProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", employeeIds);

          const profileMap = new Map(
            (employeeProfiles || []).map(p => [p.id, { full_name: p.full_name || "Unknown", email: p.email }])
          );

          setJoinRequests(joinRequestsData.map(req => ({
            ...req,
            employee: profileMap.get(req.employee_id) || { full_name: "Unknown", email: "unknown" }
          })));
        } else {
          setJoinRequests([]);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load join requests");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    try {
      const functionName = action === 'approve' ? 'approve_join_request' : 'reject_join_request';
      const { error } = await supabase.rpc(functionName, { request_id: requestId });

      if (error) throw error;

      toast.success(`Join request ${action}d successfully`);
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(error?.message ? error.message : `Failed to ${action} join request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Join Requests</h1>
          <p className="text-lg text-muted-foreground">Review and manage employee join requests</p>
        </div>

        {joinRequests.length > 0 ? (
          <div className="space-y-4">
            {joinRequests.map(request => (
              <Card
                key={request.id}
                id={`jr-${request.id}`}
                className="shadow-card transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{request.employee.full_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {request.employee.email}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => handleJoinRequestAction(request.id, 'reject')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleJoinRequestAction(request.id, 'approve')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Pending Join Requests</h3>
              <p className="text-muted-foreground">
                You're all caught up! New join requests will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminJoinRequests;
