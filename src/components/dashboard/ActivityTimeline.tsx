import { useState, useEffect } from "react";
import { Loader2, Clock, CheckCircle, XCircle, UserPlus, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TimelineItem {
  id: string;
  type: "expense_submitted" | "expense_approved" | "expense_rejected" | "join_request";
  title: string;
  description: string;
  timestamp: string;
  amount?: string;
  merchant?: string;
  employee?: string;
  category?: string;
  status: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  expense_submitted: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    label: "Submitted",
  },
  expense_approved: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    label: "Approved",
  },
  expense_rejected: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-500/10",
    label: "Rejected",
  },
  join_request: {
    icon: UserPlus,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    label: "Join Request",
  },
};

export const ActivityTimeline = () => {
  const [activities, setActivities] = useState<TimelineItem[]>([]);
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

      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      const transformed = (notificationsData || [])
        .filter((notif) =>
          ["expense_submitted", "expense_approved", "expense_rejected", "join_request"].includes(notif.type)
        )
        .map((notif) => {
          // Try to extract amount from message
          const amountMatch = notif.message?.match(/₹[\d,]+/);
          const amount = amountMatch ? amountMatch[0] : undefined;

          return {
            id: notif.id,
            type: notif.type as TimelineItem["type"],
            title: notif.title,
            description: notif.message,
            timestamp: notif.created_at,
            amount,
            status: notif.type,
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
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-base font-medium text-foreground">Activity</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Recent events across your organization</p>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here</p>
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border/60" />

              <div className="space-y-1">
                {activities.map((activity) => {
                  const config = statusConfig[activity.type] || statusConfig.expense_submitted;
                  const Icon = config.icon;

                  return (
                    <div
                      key={activity.id}
                      className="group relative flex items-start gap-4 py-3 pl-1 pr-2 rounded-lg hover:bg-slate-50 dark:hover:bg-muted/20 transition-colors duration-150"
                    >
                      {/* Status dot */}
                      <div className={cn(
                        "relative z-10 w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0",
                        config.bg
                      )}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium leading-snug line-clamp-1">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {activity.description}
                        </p>
                      </div>

                      {/* Right side: amount + time */}
                      <div className="text-right flex-shrink-0 pt-0.5">
                        {activity.amount && (
                          <p className="text-sm font-semibold tabular-nums">{activity.amount}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
