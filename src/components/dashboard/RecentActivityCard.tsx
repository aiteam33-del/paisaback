import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronRight, Loader2, Clock, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "expense_submitted" | "expense_approved" | "expense_rejected" | "join_request";
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

export const RecentActivityCard = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      // Get recent notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      const transformed = (notificationsData || [])
        .filter((notif) => {
          // Filter for valid activity types
          return ["expense_submitted", "expense_approved", "expense_rejected", "join_request"].includes(notif.type);
        })
        .map((notif) => {
          let icon = Activity;
          let color = "text-muted-foreground";

          switch (notif.type) {
            case "expense_submitted":
              icon = Clock;
              color = "text-warning";
              break;
            case "expense_approved":
              icon = CheckCircle;
              color = "text-success";
              break;
            case "expense_rejected":
              icon = XCircle;
              color = "text-destructive";
              break;
            case "join_request":
              icon = UserPlus;
              color = "text-primary";
              break;
          }

          return {
            id: notif.id,
            type: notif.type as "expense_submitted" | "expense_approved" | "expense_rejected" | "join_request",
            title: notif.title,
            description: notif.message,
            timestamp: notif.created_at,
            icon,
            color,
          };
        });

      setActivities(transformed);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm py-8">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="relative pl-8 pb-3 last:pb-0"
                >
                  {/* Timeline line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
                  )}
                  
                  {/* Icon */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-border/50 flex items-center justify-center ${activity.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{activity.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
