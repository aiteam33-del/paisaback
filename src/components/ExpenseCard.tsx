import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

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
                    setIsLoadingReceipt(true);
                    try {
                      const raw = expense.attachments![0];
                      let filePath = '';
                      const match = typeof raw === 'string' ? raw.match(/\/receipts\/([^?]+)/) : null;
                      if (match && match[1]) {
                        filePath = match[1];
                      } else {
                        filePath = raw;
                      }
                      const { data, error } = await supabase.storage
                        .from('receipts')
                        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
                      if (error || !data) {
                        console.error('Signed URL error:', error);
                        setReceiptUrl(raw as string);
                      } else {
                        setReceiptUrl(data.signedUrl);
                      }
                    } catch (err) {
                      console.error('Receipt open failed:', err);
                      setReceiptUrl(expense.attachments![0] as string);
                    } finally {
                      setIsLoadingReceipt(false);
                    }
                  }}
                  disabled={isLoadingReceipt}
                >
                  {isLoadingReceipt ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Receipt
                    </>
                  )}
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

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!receiptUrl} onOpenChange={() => setReceiptUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Receipt - {expense.vendor}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[70vh] overflow-auto">
            {receiptUrl && (
              <img 
                src={receiptUrl} 
                alt="Receipt" 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  console.error('Image load failed');
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RmFpbGVkIHRvIGxvYWQgcmVjZWlwdDwvdGV4dD48L3N2Zz4=';
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
