import { LucideIcon } from "lucide-react";

interface TrustBadgeProps {
  icon: LucideIcon;
  text: string;
}

export const TrustBadge = ({ icon: Icon, text }: TrustBadgeProps) => {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
};
