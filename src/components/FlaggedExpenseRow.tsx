import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlaggedExpenseRowProps {
  expense: {
    id: string;
    amount: number;
    vendor: string;
    category: string;
    date: string;
    status: string;
    suspicionScore?: number;
    reasonCodes?: string[];
  };
  onClick: () => void;
}

export const FlaggedExpenseRow = ({ expense, onClick }: FlaggedExpenseRowProps) => {
  const score = expense.suspicionScore || 0;
  const severity = score >= 60 ? "high" : score >= 40 ? "medium" : "low";
  
  const severityConfig = {
    high: {
      color: "border-l-destructive bg-destructive/5",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      badge: "bg-destructive/20 text-destructive border-destructive/30"
    },
    medium: {
      color: "border-l-warning bg-warning/5",
      icon: Info,
      iconColor: "text-warning",
      badge: "bg-warning/20 text-warning border-warning/30"
    },
    low: {
      color: "border-l-muted bg-muted/20",
      icon: CheckCircle,
      iconColor: "text-muted-foreground",
      badge: "bg-muted text-muted-foreground border-border"
    }
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "border-l-4 p-4 rounded-r-lg cursor-pointer transition-all hover:shadow-md",
        config.color
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={cn("w-5 h-5 mt-0.5", config.iconColor)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">{expense.vendor}</span>
              <Badge variant="outline" className="text-xs">
                {expense.category}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">₹{expense.amount.toFixed(2)}</span>
              <span>{new Date(expense.date).toLocaleDateString()}</span>
              <Badge variant="outline" className="text-xs">
                {expense.status}
              </Badge>
            </div>
            {expense.reasonCodes && expense.reasonCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {expense.reasonCodes.slice(0, 3).map((code, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {code}
                  </Badge>
                ))}
                {expense.reasonCodes.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{expense.reasonCodes.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <Badge className={cn("font-mono", config.badge)}>
            {score}
          </Badge>
          <Button variant="ghost" size="sm" className="text-xs">
            Review →
          </Button>
        </div>
      </div>
    </div>
  );
};