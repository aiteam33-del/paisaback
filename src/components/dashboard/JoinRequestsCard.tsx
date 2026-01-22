import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, X, ChevronRight, Loader2, Mail, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";

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
    const request = requests.find(r => r.id === requestId);
    try {
      const { error } = await supabase.rpc(
        action === "approve" ? "approve_join_request" : "reject_join_request",
        { request_id: requestId }
      );

      if (error) throw error;

      if (action === "approve") {
        toast.success("Team Member Added!", {
          description: `${request?.employee_name} has joined your organization`,
          duration: 4000,
        });
      } else {
        toast.error("Request Declined", {
          description: `${request?.employee_name}'s request has been declined`,
          duration: 4000,
        });
      }
      await loadJoinRequests();
    } catch (error: any) {
      toast.error("Action Failed", {
        description: error?.message ?? `Failed to ${action} request`,
      });
    } finally {
      setActioningId(null);
    }
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-violet-500 to-purple-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-pink-500 to-rose-500",
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20">
                <UserPlus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Join Requests</CardTitle>
                {requests.length > 0 && (
                  <Badge className="h-5 px-2 text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 animate-pulse">
                    {requests.length} new
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Team members waiting to join</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/join-requests");
            }}
            className="h-8 text-xs rounded-lg hover:bg-violet-500/10 hover:text-violet-600"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
            </div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            type="inbox"
            title="No pending requests"
            description="New team member requests will appear here"
            className="py-6"
          />
        ) : (
          <div className="space-y-3 flex-1">
            {requests.map((request) => (
              <div
                key={request.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/join-requests");
                }}
                className="group/item relative p-4 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 hover:border-violet-500/30 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* Subtle left accent */}
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-violet-500 to-purple-500 opacity-60" />

                <div className="flex items-start gap-3 mb-3 pl-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(request.employee_name)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="text-sm font-bold text-white">
                      {request.employee_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover/item:text-violet-600 transition-colors">
                      {request.employee_name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{request.employee_email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pl-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-lg border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
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
                        Decline
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-sm"
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
                        Accept
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
