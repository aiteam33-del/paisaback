import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  modes: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: "default" | "alert";
    badge?: number;
  }[];
}

export const ModeToggle = ({ modes }: ModeToggleProps) => {
  return (
    <div className="flex bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-md">
      {modes.map((mode, index) => {
        const Icon = mode.icon;
        const isAlert = mode.variant === "alert";
        const hasAlerts = mode.badge && mode.badge > 0;
        
        return (
          <Button
            key={index}
            onClick={mode.onClick}
            size="lg"
            variant="ghost"
            className={cn(
              "relative gap-2 transition-all duration-300",
              isAlert && !hasAlerts && "text-muted-foreground hover:text-foreground",
              isAlert && hasAlerts && "bg-destructive/15 border border-destructive/25 text-destructive hover:bg-destructive/20 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]",
              !isAlert && "hover:bg-white/10 hover:shadow-sm"
            )}
          >
            <Icon className="w-5 h-5" />
            {mode.label}
            {mode.badge !== undefined && mode.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {mode.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
