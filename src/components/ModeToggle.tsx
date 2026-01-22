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
    active?: boolean;
  }[];
}

export const ModeToggle = ({ modes }: ModeToggleProps) => {
  return (
    <div className="inline-flex items-center bg-muted/50 border border-border rounded-lg p-1 gap-1">
      {modes.map((mode, index) => {
        const Icon = mode.icon;
        const isAlert = mode.variant === "alert";
        const hasBadge = mode.badge !== undefined && mode.badge > 0;

        return (
          <Button
            key={index}
            onClick={mode.onClick}
            size="sm"
            variant="ghost"
            className={cn(
              "relative gap-2 rounded-md font-medium text-sm transition-all duration-200",
              mode.active
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              isAlert && hasBadge && "text-destructive"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
            {hasBadge && (
              <span className={cn(
                "min-w-[18px] h-[18px] text-[10px] font-semibold rounded-full flex items-center justify-center px-1",
                isAlert
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              )}>
                {mode.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
