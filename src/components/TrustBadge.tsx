import { LucideIcon } from "lucide-react";

interface TrustBadgeProps {
  icon: LucideIcon;
  text: string;
}

export const TrustBadge = ({ icon: Icon, text }: TrustBadgeProps) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium">{text}</span>
    </div>
  );
};
