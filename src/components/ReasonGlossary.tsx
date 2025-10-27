import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Calendar, Copy, DollarSign, User } from "lucide-react";

interface ReasonGlossaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasonCodes = [
  {
    code: "statistical_outlier",
    title: "Statistical Outlier",
    description: "Expense amount exceeds 2 standard deviations from the mean for this category.",
    icon: TrendingUp,
    severity: "high",
    action: "Review legitimacy and request supporting documentation."
  },
  {
    code: "duplicate_claim",
    title: "Duplicate Claim",
    description: "Same vendor, amount, and date appears multiple times.",
    icon: Copy,
    severity: "high",
    action: "Investigate for double-billing or reimbursement fraud."
  },
  {
    code: "date_mismatch",
    title: "Date Mismatch",
    description: "Bill date and submission date differ by 90+ days.",
    icon: Calendar,
    severity: "medium",
    action: "Verify timing and confirm expense validity."
  },
  {
    code: "threshold_gaming",
    title: "Threshold Gaming",
    description: "Amount is suspiciously close to approval thresholds (₹99, ₹199, ₹499, etc.).",
    icon: DollarSign,
    severity: "medium",
    action: "Implement split-transaction audits and spot checks."
  },
  {
    code: "weekend_office",
    title: "Weekend Office Expense",
    description: "Office category expense submitted on Saturday or Sunday.",
    icon: AlertTriangle,
    severity: "medium",
    action: "Verify legitimacy or reclassify category."
  },
  {
    code: "vendor_concentration",
    title: "Vendor Concentration",
    description: "Single vendor accounts for 5+ claims, indicating potential 'favorite vendor' abuse.",
    icon: User,
    severity: "medium",
    action: "Rotate vendors and enforce competitive bidding."
  },
  {
    code: "round_number",
    title: "Round Number Pattern",
    description: "Expense is a round number (₹100, ₹1000, etc.), suggesting estimation or inflation.",
    icon: DollarSign,
    severity: "low",
    action: "Require itemized receipts."
  },
  {
    code: "high_rejection_user",
    title: "High Rejection Rate",
    description: "User has >30% rejection rate across all submissions.",
    icon: User,
    severity: "medium",
    action: "Provide policy training or investigate non-compliance."
  }
];

export const ReasonGlossary = ({ open, onOpenChange }: ReasonGlossaryProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium":
        return "bg-warning/20 text-warning border-warning/30";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Anomaly Detection Rules</DialogTitle>
          <DialogDescription>
            Understanding how we flag suspicious expense patterns
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {reasonCodes.map((reason) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.code}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {reason.title}
                      </h3>
                      <Badge className={getSeverityColor(reason.severity)}>
                        {reason.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {reason.description}
                    </p>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <span className="font-semibold">→</span>
                      <span>{reason.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};