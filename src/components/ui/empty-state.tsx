import { cn } from "@/lib/utils";
import { Receipt, FileText, Users, TrendingUp, Shield, Inbox } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  type: 'expenses' | 'history' | 'team' | 'analytics' | 'anomalies' | 'inbox';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const illustrations = {
  expenses: {
    icon: Receipt,
    defaultTitle: "No expenses yet",
    defaultDescription: "Submit your first expense to get started",
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
  },
  history: {
    icon: FileText,
    defaultTitle: "No expense history",
    defaultDescription: "Your submitted expenses will appear here",
    gradient: "from-blue-500 to-indigo-500",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
  },
  team: {
    icon: Users,
    defaultTitle: "No team members",
    defaultDescription: "Invite employees to join your organization",
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  analytics: {
    icon: TrendingUp,
    defaultTitle: "No data to analyze",
    defaultDescription: "Analytics will appear once you have expenses",
    gradient: "from-orange-500 to-amber-500",
    bgGradient: "from-orange-500/10 to-amber-500/10",
  },
  anomalies: {
    icon: Shield,
    defaultTitle: "No anomalies detected",
    defaultDescription: "All expenses look normal",
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-500/10 to-emerald-500/10",
  },
  inbox: {
    icon: Inbox,
    defaultTitle: "All caught up!",
    defaultDescription: "No pending items to review",
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500/10 to-blue-500/10",
  },
};

export const EmptyState = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const config = illustrations[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {/* Animated Illustration */}
      <div className="relative mb-6">
        {/* Background circles */}
        <div className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-2xl scale-150",
          config.bgGradient
        )} />

        {/* Icon container */}
        <div className={cn(
          "relative w-24 h-24 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
          config.gradient
        )}>
          <Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/20 animate-pulse" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-secondary/30 animate-pulse delay-300" />
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-muted-foreground text-center max-w-xs mb-6">
        {description || config.defaultDescription}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-xl">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
