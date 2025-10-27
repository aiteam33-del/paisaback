import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, DollarSign, User, FileText, Tag, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ExpenseDetailModalProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseDetailModal = ({ expense, open, onOpenChange }: ExpenseDetailModalProps) => {
  if (!expense) return null;

  const score = expense.suspicionScore || 0;
  const severity = score >= 60 ? "high" : score >= 40 ? "medium" : "low";
  const hasDuplicate = expense.reasonCodes?.includes("duplicate_claim");

  const copyExpenseId = () => {
    navigator.clipboard.writeText(expense.id);
    toast.success("Expense ID copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-primary" />
            Expense Anomaly Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-6 mt-4">
            {/* Suspicion Score */}
            <div className={`p-4 rounded-lg border-2 ${
              severity === "high" ? "bg-red-500/10 border-red-500/50" :
              severity === "medium" ? "bg-yellow-500/10 border-yellow-500/50" :
              "bg-blue-500/10 border-blue-500/50"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Suspicion Score</span>
                  <p className="text-3xl font-bold mt-1">{score}<span className="text-lg text-muted-foreground">/100</span></p>
                </div>
                <Badge
                  variant={severity === "high" ? "destructive" : severity === "medium" ? "default" : "secondary"}
                  className="text-base px-4 py-2"
                >
                  {severity.toUpperCase()} RISK
                </Badge>
              </div>
            </div>

            {/* Duplicate Warning */}
            {hasDuplicate && expense.duplicateInfo && (
              <div className="p-4 rounded-lg bg-red-500/20 border-2 border-red-500/50 animate-pulse">
                <div className="flex items-start gap-3">
                  <Copy className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-500 mb-2">⚠️ Duplicate Claim Detected</h3>
                    <p className="text-sm text-foreground mb-2">
                      This exact expense (vendor: {expense.vendor}, amount: ₹{expense.amount}, date: {format(new Date(expense.date), "PPP")}) 
                      appears <strong>{expense.duplicateInfo.count} times</strong> in the system.
                    </p>
                    <p className="text-sm font-medium text-red-500">
                      Total duplicate amount: ₹{expense.duplicateInfo.totalAmount.toFixed(2)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-500/50 hover:bg-red-500/10"
                      onClick={() => {
                        window.location.href = `/admin/expenses?vendor=${encodeURIComponent(expense.vendor)}&amount=${expense.amount}`;
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View All {expense.duplicateInfo.count} Duplicates
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Vendor</span>
                </div>
                <p className="text-lg font-semibold">{expense.vendor}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Amount</span>
                </div>
                <p className="text-lg font-semibold">₹{Number(expense.amount).toFixed(2)}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Date</span>
                </div>
                <p className="text-sm font-medium">{format(new Date(expense.date), "PPP")}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">Category</span>
                </div>
                <p className="text-sm font-medium">{expense.category}</p>
              </div>
            </div>

            {/* Expense ID */}
            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Expense ID</span>
                  <p className="text-sm font-mono mt-1">{expense.id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={copyExpenseId}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {expense.description && (
              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Description</span>
                </div>
                <p className="text-sm text-foreground">{expense.description}</p>
              </div>
            )}

            {/* Reason Codes */}
            {expense.reasonCodes && expense.reasonCodes.length > 0 && (
              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Anomaly Flags ({expense.reasonCodes.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {expense.reasonCodes.map((code: string) => {
                    const isHighSeverity = code === "duplicate_claim" || code === "statistical_outlier";
                    return (
                      <Badge 
                        key={code} 
                        variant={isHighSeverity ? "destructive" : "outline"}
                        className="text-sm px-3 py-1"
                      >
                        {code.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
