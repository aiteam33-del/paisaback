import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeLabel,
  trend = "neutral",
  className 
}: StatCardProps) => {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <div className={cn("bg-gradient-card rounded-xl shadow-lg border border-border/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group", className)}>
      <div className="p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity"></div>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="p-2 rounded-lg bg-gradient-primary shadow-md">
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs mt-1", trendColor)}>
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span>{change > 0 ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
