import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Receipt,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getReceiptPublicUrl } from "@/lib/attachments";
import { cn } from "@/lib/utils";

interface ExpenseCardProps {
  expense: {
    id: string;
    vendor: string;
    amount: number;
    status: string;
    date: string;
    category: string;
    description: string;
    attachments?: string[];
    created_at: string;
    employee: {
      full_name: string;
      email: string;
    };
  };
  onAction?: (expenseId: string, action: "approved" | "rejected") => void;
  onViewDetails?: (expense: any) => void;
}

const statusConfig = {
  pending: {
    variant: "pending" as const,
    icon: AlertCircle,
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500",
  },
  approved: {
    variant: "approved" as const,
    icon: CheckCircle2,
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-green-500",
  },
  rejected: {
    variant: "rejected" as const,
    icon: XCircle,
    bgColor: "bg-red-500/10",
    textColor: "text-red-600 dark:text-red-400",
    gradient: "from-red-500 to-rose-500",
  },
  paid: {
    variant: "paid" as const,
    icon: Wallet,
    bgColor: "bg-primary/10",
    textColor: "text-primary",
    gradient: "from-primary to-cyan-500",
  },
};

const categoryColors: Record<string, string> = {
  travel: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  lodging: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  office: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  transport: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export const ExpenseCard = ({
  expense,
  onAction,
  onViewDetails,
}: ExpenseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const status = statusConfig[expense.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const categoryColor = categoryColors[expense.category.toLowerCase()] || categoryColors.other;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        isExpanded
          ? "border-primary/30 shadow-lg shadow-primary/5"
          : "border-border/50 hover:border-border hover:shadow-md"
      )}
    >
      {/* Status Accent Line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          status.gradient
        )}
      />

      {/* Main Content */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {/* Receipt Icon */}
          <div
            className={cn(
              "hidden sm:flex flex-shrink-0 w-14 h-14 rounded-xl items-center justify-center transition-transform duration-300 group-hover:scale-105",
              status.bgColor
            )}
          >
            <Receipt className={cn("w-7 h-7", status.textColor)} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Vendor & Status */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-base truncate">
                    {expense.vendor}
                  </h3>
                  <Badge
                    variant={status.variant}
                    className="capitalize flex items-center gap-1"
                  >
                    <StatusIcon className="w-3 h-3" />
                    {expense.status}
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {expense.employee.full_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(expense.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-xl font-bold text-foreground">
                  ₹{expense.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <Badge
                  variant="outline"
                  className={cn("capitalize text-xs border-0", categoryColor)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {expense.category}
                </Badge>
              </div>
            </div>
          </div>

          {/* Expand Toggle */}
          <button className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Section */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-4 space-y-4">
            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Tag className="w-3.5 h-3.5" />
                  Category
                </div>
                <p className="font-medium capitalize">{expense.category}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Expense Date
                </div>
                <p className="font-medium">
                  {new Date(expense.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted
                </div>
                <p className="font-medium">
                  {new Date(expense.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Description */}
            {expense.description && (
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Description
                </div>
                <p className="text-sm">{expense.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {expense.attachments && expense.attachments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newWindow = window.open("about:blank", "_blank");
                    if (!newWindow) {
                      alert("Please allow pop-ups to view receipts");
                      return;
                    }
                    newWindow.document.write(
                      '<html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;"><p style="color:#fff;font-family:system-ui;">Loading receipt...</p></body></html>'
                    );

                    try {
                      const raw = expense.attachments![0];
                      const finalUrl = getReceiptPublicUrl(raw as string);
                      newWindow.opener = null;
                      newWindow.location.replace(finalUrl);
                    } catch (err) {
                      console.error("Receipt open failed:", err);
                      newWindow.opener = null;
                      newWindow.location.replace(
                        expense.attachments![0] as string
                      );
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Receipt
                </Button>
              )}

              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(expense);
                  }}
                >
                  View Details
                </Button>
              )}

              {expense.status === "pending" && onAction && (
                <>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(expense.id, "rejected");
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(expense.id, "approved");
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
