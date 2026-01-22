import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, Clock, CheckCircle, XCircle, UserPlus, Zap } from "lucide-react";
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
  gradient: string;
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
          return ["expense_submitted", "expense_approved", "expense_rejected", "join_request"].includes(notif.type);
        })
        .map((notif) => {
          let icon = Activity;
          let color = "text-muted-foreground";
          let gradient = "from-gray-500 to-gray-400";

          switch (notif.type) {
            case "expense_submitted":
              icon = Clock;
              color = "text-amber-600 dark:text-amber-400";
              gradient = "from-amber-500 to-orange-500";
              break;
            case "expense_approved":
              icon = CheckCircle;
              color = "text-emerald-600 dark:text-emerald-400";
              gradient = "from-emerald-500 to-green-500";
              break;
            case "expense_rejected":
              icon = XCircle;
              color = "text-red-600 dark:text-red-400";
              gradient = "from-red-500 to-rose-500";
              break;
            case "join_request":
              icon = UserPlus;
              color = "text-violet-600 dark:text-violet-400";
              gradient = "from-violet-500 to-purple-500";
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
            gradient,
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
    <Card className="h-full flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20">
              <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Latest updates</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-cyan-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60">Actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="group/item relative pl-10 py-3 hover:bg-muted/30 rounded-xl transition-colors"
                >
                  {/* Timeline line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-[18px] top-12 bottom-0 w-px bg-gradient-to-b from-border to-transparent" />
                  )}

                  {/* Icon with gradient background */}
                  <div className={`absolute left-0 top-3 w-9 h-9 rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight group-hover/item:text-foreground transition-colors">
                        {activity.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
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
