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
    <div className="flex bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-1.5 shadow-lg">
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
              "relative gap-2 transition-all duration-300 rounded-lg font-medium",
              isAlert 
                ? "bg-destructive/20 border border-destructive/30 text-destructive hover:bg-destructive/30 hover:border-destructive/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            )}
          >
            <Icon className="w-5 h-5" />
            {mode.label}
            {mode.badge !== undefined && mode.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-md">
                {mode.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
