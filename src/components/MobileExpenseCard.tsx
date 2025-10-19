import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye, Calendar, Receipt, User } from "lucide-react";
import { format } from "date-fns";

interface MobileExpenseCardProps {
  expense: any;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

interface Expense {
  manager_notes?: string;
  [key: string]: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "approved":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "paid":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

export const MobileExpenseCard = ({
  expense,
  onView,
  onApprove,
  onReject,
  showActions = false,
  isSelected = false,
  onSelect,
}: MobileExpenseCardProps) => {
  return (
    <Card className={`${isSelected ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{expense.vendor}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {expense.description || "No description"}
              </p>
            </div>
            <Badge className={getStatusColor(expense.status)}>
              {expense.status}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{expense.employee?.full_name}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-2xl font-bold">₹{expense.amount.toFixed(2)}</span>
            <Badge variant="outline">{expense.category}</Badge>
          </div>

          {/* Manager Notes */}
          {expense.manager_notes && (
            <div className="p-2 bg-muted/50 rounded-md border border-border">
              <p className="text-xs font-semibold text-foreground mb-1">Manager Notes:</p>
              <p className="text-xs text-muted-foreground">{expense.manager_notes}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && expense.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={onApprove}
                size="sm"
                className="flex-1"
                variant="default"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                onClick={onReject}
                size="sm"
                className="flex-1"
                variant="destructive"
              >
                <XCircle className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </div>
          )}

          {!showActions && (
            <Button onClick={onView} size="sm" variant="outline" className="w-full">
              <Eye className="mr-2 h-3 w-3" />
              View Details
            </Button>
          )}

          {onSelect && (
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  className="rounded border-gray-300"
                />
                <span>Select for batch action</span>
              </label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};