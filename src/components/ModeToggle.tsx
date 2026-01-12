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
    <div className="flex gap-3 p-2 bg-gradient-to-r from-card/95 via-card to-card/95 backdrop-blur-xl border-2 border-primary/40 rounded-2xl shadow-2xl">
      {modes.map((mode, index) => {
        const Icon = mode.icon;
        const isAlert = mode.variant === "alert";
        const hasAlerts = mode.badge && mode.badge > 0;

        return (
          <Button
            key={index}
            onClick={mode.onClick}
            size="lg"
            className={cn(
              "relative gap-3 px-6 py-7 transition-all duration-500 rounded-xl font-bold text-base group overflow-hidden",
              isAlert
                ? "bg-gradient-to-br from-destructive via-destructive/90 to-destructive/80 text-white border-2 border-destructive/60 hover:border-destructive hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] shadow-vibrant-alert"
                : "bg-gradient-to-br from-secondary via-primary to-primary/90 text-white border-2 border-primary/60 hover:border-primary hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] shadow-vibrant-primary"
            )}
          >
            {/* Shine effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <Icon className="w-6 h-6 relative z-10 drop-shadow-md" />
            <span className="relative z-10">{mode.label}</span>

            {mode.badge !== undefined && mode.badge > 0 && (
              <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-accent via-accent to-accent/90 text-accent-foreground text-sm font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-xl border-2 border-white z-20">
                {mode.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
