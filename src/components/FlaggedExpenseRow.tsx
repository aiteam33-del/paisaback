import { AlertTriangle, TrendingUp, DollarSign, Calendar, Target, Copy, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface FlaggedExpenseRowProps {
  expense: any;
  onClick: () => void;
}

const getReasonIcon = (code: string) => {
  switch (code) {
    case "statistical_outlier":
      return TrendingUp;
    case "duplicate_claim":
      return Copy;
    case "date_mismatch":
      return Clock;
    case "round_number":
      return DollarSign;
    case "weekend_office":
      return Calendar;
    case "threshold_gaming":
      return Target;
    default:
      return AlertTriangle;
  }
};

const getReasonLabel = (code: string) => {
  const labels: Record<string, string> = {
    statistical_outlier: "Statistical Outlier",
    duplicate_claim: "Duplicate Claim",
    date_mismatch: "Date Mismatch",
    round_number: "Round Number",
    weekend_office: "Weekend Office",
    threshold_gaming: "Threshold Gaming"
  };
  return labels[code] || code;
};

export const FlaggedExpenseRow = ({ expense, onClick }: FlaggedExpenseRowProps) => {
  const score = expense.suspicionScore || 0;
  const severity = score >= 60 ? "high" : score >= 40 ? "medium" : "low";
  const severityColors = {
    high: "border-red-500/50 bg-red-500/10 hover:bg-red-500/15",
    medium: "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/15",
    low: "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15"
  };

  const hasDuplicate = expense.reasonCodes?.includes("duplicate_claim");
  const duplicateCount = expense.duplicateInfo?.count || 0;

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-lg transition-all ${severityColors[severity]} border-2`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={severity === "high" ? "destructive" : severity === "medium" ? "default" : "secondary"}
              className="font-semibold"
            >
              {severity.toUpperCase()} RISK
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">Score: {score}/100</span>
            {hasDuplicate && (
              <Badge variant="destructive" className="animate-pulse">
                <Copy className="w-3 h-3 mr-1" />
                {duplicateCount}x Duplicate
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">{expense.vendor}</p>
              <p className="text-sm text-muted-foreground">
                {expense.category} • {new Date(expense.date).toLocaleDateString()} • ID: {expense.id.slice(0, 8)}
              </p>
              {hasDuplicate && expense.duplicateInfo && (
                <p className="text-sm text-red-500 font-medium mt-1">
                  ⚠️ {duplicateCount} identical claims found (Total: ₹{expense.duplicateInfo.totalAmount.toFixed(2)})
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">₹{Number(expense.amount).toFixed(2)}</p>
              <Badge variant="outline" className="mt-1">
                {expense.status}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(expense.reasonCodes || []).map((code: string) => {
              const Icon = getReasonIcon(code);
              const isHighSeverity = code === "duplicate_claim" || code === "statistical_outlier";
              return (
                <div
                  key={code}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
                    isHighSeverity 
                      ? "bg-red-500/20 border-red-500/50 text-red-500" 
                      : "bg-background/50 border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{getReasonLabel(code)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
