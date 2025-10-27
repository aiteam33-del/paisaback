import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calendar, DollarSign, User, Building, Tag, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ExpenseDetailModalProps {
  expense: {
    id: string;
    amount: number;
    vendor: string;
    category: string;
    date: string;
    status: string;
    description?: string;
    suspicionScore?: number;
    reasonCodes?: string[];
    user_id?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseDetailModal = ({ expense, open, onOpenChange }: ExpenseDetailModalProps) => {
  const [reviewed, setReviewed] = useState(false);

  if (!expense) return null;

  const score = expense.suspicionScore || 0;
  const severity = score >= 60 ? "high" : score >= 40 ? "medium" : "low";

  const severityConfig = {
    high: {
      color: "bg-destructive/20 text-destructive border-destructive/30",
      label: "HIGH SUSPICION"
    },
    medium: {
      color: "bg-warning/20 text-warning border-warning/30",
      label: "MEDIUM SUSPICION"
    },
    low: {
      color: "bg-muted text-muted-foreground border-border",
      label: "LOW SUSPICION"
    }
  };

  const config = severityConfig[severity];

  const reasonExplanations: Record<string, string> = {
    statistical_outlier: "Amount is significantly higher than typical expenses in this category",
    duplicate_claim: "Identical vendor, amount, and date detected in another submission",
    date_mismatch: "Long delay between bill date and submission date",
    threshold_gaming: "Amount suspiciously close to approval threshold",
    weekend_office: "Office expense submitted on weekend",
    vendor_concentration: "High frequency of claims from this vendor",
    round_number: "Round number suggests estimation rather than actual receipt",
    high_rejection_user: "Submitter has elevated rejection rate"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">Expense Analysis</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Detailed anomaly breakdown and context
              </p>
            </div>
            <Badge className={`${config.color} font-mono text-lg px-4 py-2`}>
              {score}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                <p className="font-semibold">{expense.vendor}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-semibold font-mono">₹{expense.amount.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Badge variant="outline">{expense.category}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="font-semibold">{new Date(expense.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant="secondary">{expense.status}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
            </div>
          </div>

          {expense.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{expense.description}</p>
              </div>
            </>
          )}

          {/* Reason Codes */}
          {expense.reasonCodes && expense.reasonCodes.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Detection Reasons</p>
                <div className="space-y-3">
                  {expense.reasonCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{code}</p>
                        <p className="text-xs text-muted-foreground">
                          {reasonExplanations[code] || "Flagged by anomaly detection system"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Suggested Actions */}
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3">Suggested Actions</p>
            <div className="space-y-2 text-sm">
              {severity === "high" && (
                <>
                  <div className="flex items-start gap-2 text-destructive">
                    <span>•</span>
                    <span>Require additional supporting documentation</span>
                  </div>
                  <div className="flex items-start gap-2 text-destructive">
                    <span>•</span>
                    <span>Escalate to finance team for manual review</span>
                  </div>
                  <div className="flex items-start gap-2 text-destructive">
                    <span>•</span>
                    <span>Consider flagging vendor for audit</span>
                  </div>
                </>
              )}
              {severity === "medium" && (
                <>
                  <div className="flex items-start gap-2 text-warning">
                    <span>•</span>
                    <span>Request approver to add review notes</span>
                  </div>
                  <div className="flex items-start gap-2 text-warning">
                    <span>•</span>
                    <span>Verify receipt matches claimed amount</span>
                  </div>
                </>
              )}
              {severity === "low" && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span>•</span>
                  <span>Standard approval process can proceed</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-3">
            <Button
              onClick={() => setReviewed(true)}
              disabled={reviewed}
              className="flex-1"
              variant={reviewed ? "outline" : "default"}
            >
              {reviewed ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marked as Reviewed
                </>
              ) : (
                "Mark as Reviewed"
              )}
            </Button>
            <Button variant="outline" className="flex-1">
              View Full Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};