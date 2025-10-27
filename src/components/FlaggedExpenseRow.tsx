import { 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Target, 
  Copy, 
  Clock, 
  Receipt,
  CheckCircle,
  Users,
  AlertCircle,
  FileX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FlaggedExpenseRowProps {
  expense: any;
  onClick: () => void;
  onReject?: () => void;
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
    duplicate_claim: "Duplicate Transaction Detected",
    date_mismatch: "Date Mismatch Detected",
    round_number: "Suspicious Round Number",
    weekend_office: "Weekend Office Expense",
    threshold_gaming: "Threshold Gaming Detected"
  };
  return labels[code] || code;
};

const getReasonDetails = (code: string, expense: any) => {
  switch (code) {
    case "duplicate_claim":
      return [
        `Same vendor: "${expense.vendor}"`,
        `Identical amount: ₹${Number(expense.amount).toFixed(0)}`,
        `Same date: ${new Date(expense.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
      ];
    case "statistical_outlier":
      return [
        `Amount significantly above average`,
        `Statistical deviation detected`,
        `Requires additional verification`
      ];
    case "date_mismatch":
      return [
        `Bill date differs from submission`,
        `Delayed submission detected`,
        `Verify transaction authenticity`
      ];
    case "round_number":
      return [
        `Suspiciously round amount`,
        `No fractional components`,
        `May lack supporting receipt`
      ];
    case "weekend_office":
      return [
        `Office expense on weekend`,
        `Unusual transaction timing`,
        `Requires manager approval`
      ];
    case "threshold_gaming":
      return [
        `Amount close to approval limit`,
        `Possible threshold avoidance`,
        `Review authorization policy`
      ];
    default:
      return [];
  }
};

export const FlaggedExpenseRow = ({ expense, onClick, onReject }: FlaggedExpenseRowProps) => {
  const { user } = useAuth();
  const [employeeName, setEmployeeName] = useState<string>("");
  const [employeeDepartment, setEmployeeDepartment] = useState<string>("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const score = expense.suspicionScore || 0;
  const severity = score >= 50 ? "high" : score >= 30 ? "medium" : "low";
  
  const severityConfig = {
    high: {
      border: "border-red-500",
      bg: "bg-red-500/5",
      headerBg: "bg-red-500/20",
      headerBorder: "border-red-500/30",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-600",
      badgeBg: "bg-red-600",
      textColor: "text-red-600",
      label: "CRITICAL RISK",
      badge: "HIGH"
    },
    medium: {
      border: "border-orange-500",
      bg: "bg-orange-500/5",
      headerBg: "bg-orange-500/20",
      headerBorder: "border-orange-500/30",
      iconBg: "bg-orange-500/20",
      iconColor: "text-orange-600",
      badgeBg: "bg-orange-600",
      textColor: "text-orange-600",
      label: "UNUSUAL PATTERN",
      badge: "MEDIUM"
    },
    low: {
      border: "border-yellow-500",
      bg: "bg-yellow-500/5",
      headerBg: "bg-yellow-500/20",
      headerBorder: "border-yellow-500/30",
      iconBg: "bg-yellow-500/20",
      iconColor: "text-yellow-600",
      badgeBg: "bg-yellow-600",
      textColor: "text-yellow-600",
      label: "POLICY ISSUE",
      badge: "LOW"
    }
  };

  const config = severityConfig[severity];
  const primaryReason = expense.reasonCodes?.[0] || "statistical_outlier";
  const ReasonIcon = getReasonIcon(primaryReason);
  const reasonDetails = getReasonDetails(primaryReason, expense);
  const duplicateCount = expense.duplicateInfo?.count || 0;
  const timeAgo = formatDistanceToNow(new Date(expense.created_at), { addSuffix: true });

  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", expense.user_id)
        .maybeSingle();
      
      if (data) {
        setEmployeeName(data.full_name || data.email || "Unknown Employee");
        // You can add department field to profiles table if needed
        setEmployeeDepartment(""); // Placeholder
      }
    };
    
    if (expense.user_id) {
      fetchEmployeeInfo();
    }
  }, [expense.user_id]);

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!user) return;
    
    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          status: "rejected",
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          finance_notes: `Flagged by anomaly detection system. Reason: ${getReasonLabel(primaryReason)}`
        })
        .eq("id", expense.id);

      if (error) throw error;

      toast.success("Expense rejected successfully");
      setShowRejectDialog(false);
      
      // Call the optional onReject callback to refresh the list
      if (onReject) {
        onReject();
      }
    } catch (error: any) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <Card
      className={`border-2 ${config.border} ${config.bg} shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fade-in`}
    >
      {/* Header */}
      <div className={`${config.headerBg} px-4 py-3 border-b ${config.headerBorder} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <AlertCircle className={`w-5 h-5 ${config.iconColor}`} />
          <span className={`text-sm font-bold ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <Badge className={`${config.badgeBg} text-white border-0 font-bold px-3 py-1`}>
          {config.badge}
        </Badge>
      </div>

      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
            <ReasonIcon className={`w-8 h-8 ${config.iconColor}`} />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-2">
              {getReasonLabel(primaryReason)}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {expense.category} • ₹{Number(expense.amount).toFixed(0)} • {timeAgo}
            </p>
            {employeeName && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="w-4 h-4" />
                <span>
                  {employeeName}
                  {employeeDepartment && ` (${employeeDepartment})`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        {reasonDetails.length > 0 && (
          <div className="bg-background/50 rounded-lg p-4 border border-border mb-4">
            <div className="space-y-2">
              {reasonDetails.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className={`w-4 h-4 ${config.iconColor} mt-0.5 flex-shrink-0`} />
                  <span className="text-sm text-foreground">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Message */}
        {primaryReason === "duplicate_claim" && duplicateCount > 1 && (
          <div className={`flex items-start gap-2 mb-4 p-3 rounded-lg ${config.headerBg} border ${config.headerBorder}`}>
            <AlertTriangle className={`w-4 h-4 ${config.iconColor} mt-0.5 flex-shrink-0`} />
            <span className={`text-sm font-semibold ${config.textColor}`}>
              ⚠️ Matches {duplicateCount - 1} other expense{duplicateCount > 2 ? 's' : ''} with identical details
            </span>
          </div>
        )}

        {/* Secondary Reasons */}
        {expense.reasonCodes && expense.reasonCodes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {expense.reasonCodes.slice(1).map((code: string) => {
              const Icon = getReasonIcon(code);
              return (
                <div
                  key={code}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs"
                >
                  <Icon className="w-3 h-3" />
                  <span className="font-medium">{getReasonLabel(code)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1 font-semibold"
            onClick={handleRejectClick}
            disabled={expense.status === "rejected"}
          >
            {expense.status === "rejected" ? "Already Rejected" : "Flag & Reject"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-semibold border-2"
            onClick={handleReview}
          >
            Review Details
          </Button>
        </div>
      </CardContent>

      {/* Rejection Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Flagged Expense?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-foreground">
                  You are about to reject this expense:
                </p>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="font-semibold">{expense.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">₹{Number(expense.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee:</span>
                    <span className="font-semibold">{employeeName || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="font-semibold text-destructive">{getReasonLabel(primaryReason)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  The employee will be notified of the rejection. This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
