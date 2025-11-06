import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getReceiptPublicUrl } from "@/lib/attachments";
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

export const ExpenseCard = ({ expense, onAction, onViewDetails }: ExpenseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/20 text-warning border-warning/30";
      case "approved": return "bg-success/20 text-success border-success/30";
      case "rejected": return "bg-destructive/20 text-destructive border-destructive/30";
      case "paid": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <Card className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-primary/50 hover:border-l-primary">
      {/* Card Header - Always Visible */}
      <CardContent className="p-4">
        <div
          className="flex items-start justify-between gap-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{expense.vendor}</h3>
              <Badge className={getStatusColor(expense.status)}>
                {expense.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{expense.employee.full_name}</p>
              <p>Submitted {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xl font-bold">₹{expense.amount.toFixed(2)}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium capitalize">{expense.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Expense Date:</span>
                <p className="font-medium">
                  {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Submitted:</span>
                <p className="font-medium">
                  {new Date(expense.created_at).toLocaleDateString()} ({formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })})
                </p>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground text-sm">Description:</span>
              <p className="mt-1">{expense.description}</p>
            </div>

            {expense.attachments && expense.attachments.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Receipt:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={async (e) => {
                    e.stopPropagation();
                    // Open window immediately (synchronously) to avoid popup blocker
                    const newWindow = window.open('about:blank', '_blank');
                    if (!newWindow) {
                      alert('Please allow pop-ups to view receipts');
                      return;
                    }
                    newWindow.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a1a;"><p style="color:#fff;">Loading receipt...</p></body></html>');
                    
                    try {
                      const raw = expense.attachments![0];
                      const finalUrl = getReceiptPublicUrl(raw as string);
                      newWindow.opener = null;
                      newWindow.location.replace(finalUrl);
                    } catch (err) {
                      console.error('Receipt open failed:', err);
                      newWindow.opener = null;
                      newWindow.location.replace(expense.attachments![0] as string);
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Receipt
                </Button>
              </div>
            )}

            {expense.status === "pending" && onAction && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(expense.id, "rejected");
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(expense.id, "approved");
                  }}
                >
                  Approve
                </Button>
              </div>
            )}

            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(expense);
                }}
              >
                View Full Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
