import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "primary" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: {
    gradient: "from-slate-500/10 to-slate-600/5",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    accentLine: "from-slate-400 to-slate-500",
  },
  primary: {
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    accentLine: "from-primary to-primary/60",
  },
  success: {
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentLine: "from-emerald-400 to-emerald-600",
  },
  warning: {
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    accentLine: "from-amber-400 to-amber-500",
  },
  info: {
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentLine: "from-blue-400 to-blue-600",
  },
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  trend = "neutral",
  variant = "default",
  className,
}: StatCardProps) => {
  const styles = variantStyles[variant];

  const trendConfig = {
    up: {
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      Icon: TrendingUp,
    },
    down: {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      Icon: TrendingDown,
    },
    neutral: {
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      Icon: Minus,
    },
  };

  const trendStyle = trendConfig[trend];
  const TrendIcon = trendStyle.Icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6",
        "hover:border-border hover:shadow-lg transition-all duration-300",
        "dark:bg-card/50 dark:backdrop-blur-sm",
        className
      )}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-70",
          styles.gradient
        )}
      />

      {/* Accent Line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          styles.accentLine
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl transition-transform duration-300 group-hover:scale-110",
              styles.iconBg
            )}
          >
            <Icon className={cn("w-6 h-6", styles.iconColor)} />
          </div>

          {/* Trend Badge */}
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                trendStyle.bgColor,
                trendStyle.color
              )}
            >
              <TrendIcon className="w-3 h-3" />
              <span>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          {changeLabel && (
            <p className="text-xs text-muted-foreground/70 mt-1">{changeLabel}</p>
          )}
        </div>
      </div>

      {/* Decorative Element */}
      <div
        className={cn(
          "absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl transition-transform duration-500 group-hover:scale-150",
          variant === "primary" && "bg-primary",
          variant === "success" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "info" && "bg-blue-500",
          variant === "default" && "bg-slate-500"
        )}
      />
    </div>
  );
};
