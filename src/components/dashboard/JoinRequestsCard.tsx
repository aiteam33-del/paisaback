import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, X, ChevronRight, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface JoinRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  created_at: string;
}

export const JoinRequestsCard = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadJoinRequests();
  }, []);

  const loadJoinRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      const { data: requestsData } = await supabase
        .from("join_requests")
        .select(`
          id,
          employee_id,
          created_at,
          profiles!join_requests_employee_id_fkey (
            full_name,
            email
          )
        `)
        .eq("org_id", orgData.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      const transformed = (requestsData || []).map((req: any) => ({
        id: req.id,
        employee_id: req.employee_id,
        employee_name: req.profiles?.full_name || "Unknown",
        employee_email: req.profiles?.email || "",
        created_at: req.created_at,
      }));

      setRequests(transformed);
    } catch (error) {
      console.error("Failed to load join requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setActioningId(requestId);
    try {
      const { error } = await supabase.rpc(
        action === "approve" ? "approve_join_request" : "reject_join_request",
        { request_id: requestId }
      );

      if (error) throw error;

      toast.success(`Request ${action}d successfully`);
      await loadJoinRequests();
    } catch (error: any) {
      toast.error(error?.message ?? `Failed to ${action} request`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Card className="group relative shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-primary/50">
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Join Requests</CardTitle>
            {requests.length > 0 && (
              <Badge className="bg-primary text-primary-foreground h-5 px-2 text-xs animate-pulse">
                {requests.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/join-requests");
            }}
            className="h-8 text-xs hover:bg-primary/20"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm py-8">
            No pending join requests
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {requests.map((request) => (
              <div
                key={request.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/join-requests");
                }}
                className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-gradient-card-hover hover:border-primary/30 transition-all duration-300 hover:shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <span className="text-xs font-semibold text-primary">
                      {request.employee_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{request.employee_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{request.employee_email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(request.id, "reject");
                    }}
                    disabled={actioningId === request.id}
                  >
                    {actioningId === request.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-success hover:bg-success/90 text-white transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(request.id, "approve");
                    }}
                    disabled={actioningId === request.id}
                  >
                    {actioningId === request.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
