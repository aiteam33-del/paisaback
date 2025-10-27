import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnomalyKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  severity?: "high" | "medium" | "low";
}

export const AnomalyKPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  severity = "low"
}: AnomalyKPICardProps) => {
  const severityColors = {
    high: "bg-destructive/10 border-destructive/30",
    medium: "bg-warning/10 border-warning/30",
    low: "bg-muted/50 border-border/50"
  };

  const iconColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-white",
    low: "bg-primary text-primary-foreground"
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-lg", severityColors[severity])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl shadow-lg", iconColors[severity])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <span className={cn(
              "text-xs font-medium",
              trend === "up" ? "text-destructive" : trend === "down" ? "text-success" : "text-muted-foreground"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trend === "up" ? "Increasing" : trend === "down" ? "Decreasing" : "Stable"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};