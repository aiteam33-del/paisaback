import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, Target, AlertTriangle, Copy, Clock, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReasonGlossaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasons = [
  {
    code: "ai_generated",
    title: "AI-Generated or Altered Image",
    severity: "CRITICAL",
    icon: Bot,
    description: "Receipt image detected as AI-generated or digitally altered using advanced image forensics. This indicates potential fabrication or manipulation of the receipt.",
    suggestion: "IMMEDIATE ACTION REQUIRED: Contact the employee for explanation and request original receipt. This is the highest severity flag and may indicate fraudulent activity.",
    color: "text-red-600"
  },
  {
    code: "statistical_outlier",
    title: "Statistical Outlier",
    severity: "HIGH",
    icon: TrendingUp,
    description: "Expense amount exceeds 2 standard deviations from the mean for this category.",
    suggestion: "Review legitimacy and request supporting documentation.",
    color: "text-red-500"
  },
  {
    code: "duplicate_claim",
    title: "Duplicate Claim",
    severity: "HIGH",
    icon: Copy,
    description: "Same vendor, amount, and date appears multiple times. Possible double-billing or reimbursement fraud.",
    suggestion: "Investigate for double-billing or reimbursement fraud. Check if multiple employees submitted the same receipt.",
    color: "text-red-500"
  },
  {
    code: "date_mismatch",
    title: "Date Mismatch",
    severity: "MEDIUM",
    icon: Clock,
    description: "Bill date and submission date differ by 90+ days.",
    suggestion: "Verify timing and confirm expense validity. Old receipts may indicate retroactive claims.",
    color: "text-orange-500"
  },
  {
    code: "round_number",
    title: "Round Number",
    severity: "LOW",
    icon: DollarSign,
    description: "Amount is a suspiciously round number (e.g., ₹1000, ₹5000).",
    suggestion: "Round numbers may indicate estimated rather than actual expenses.",
    color: "text-yellow-500"
  },
  {
    code: "weekend_office",
    title: "Weekend Office Expense",
    severity: "MEDIUM",
    icon: Calendar,
    description: "Office expenses claimed during weekend when office is typically closed.",
    suggestion: "Verify if weekend work was authorized and legitimate.",
    color: "text-orange-500"
  },
  {
    code: "threshold_gaming",
    title: "Threshold Gaming",
    severity: "MEDIUM",
    icon: Target,
    description: "Amount is suspiciously close to approval thresholds (₹99, ₹199, ₹499, etc.).",
    suggestion: "Possible attempt to stay under approval limits. Request itemized receipt.",
    color: "text-orange-500"
  }
];

export const ReasonGlossary = ({ open, onOpenChange }: ReasonGlossaryProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-primary" />
            Anomaly Detection Rules
          </DialogTitle>
          <DialogDescription>
            Understanding how we flag suspicious expense patterns
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-4 mt-4">
            {reasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <div
                  key={reason.code}
                  className="p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${reason.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-base">{reason.title}</h3>
                        <Badge
                          variant={
                            reason.severity === "CRITICAL" ? "destructive" :
                            reason.severity === "HIGH" ? "destructive" : 
                            reason.severity === "MEDIUM" ? "default" : 
                            "secondary"
                          }
                          className="font-medium"
                        >
                          {reason.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{reason.description}</p>
                      <div className="bg-background/50 rounded-md p-3 border border-border/50">
                        <p className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-primary font-bold">→</span>
                          <span className="font-medium">{reason.suggestion}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
