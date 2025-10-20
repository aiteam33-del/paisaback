import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  linkTo: string;
  actionText: string;
  highlight?: boolean;
}

export const SummaryCard = ({
  title,
  value,
  icon: Icon,
  linkTo,
  actionText,
  highlight = false,
}: SummaryCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className={`shadow-card border-primary/20 hover:border-primary/40 transition-all ${highlight ? "bg-gradient-primary text-primary-foreground" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "" : "text-primary"}`} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`text-3xl font-bold ${highlight ? "" : "text-primary"}`}>{value}</div>
        <Button
          variant={highlight ? "secondary" : "outline"}
          size="sm"
          onClick={() => navigate(linkTo)}
          className={`w-full ${!highlight ? "border-primary/50 hover:bg-primary hover:text-primary-foreground" : ""}`}
        >
          {actionText}
        </Button>
      </CardContent>
    </Card>
  );
};
