import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, DollarSign, User, FileText, Tag, AlertTriangle, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ExpenseDetailModalProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseDetailModal = ({ expense, open, onOpenChange }: ExpenseDetailModalProps) => {
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateExpenses, setDuplicateExpenses] = useState<any[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  if (!expense) return null;

  const score = expense.suspicionScore || 0;
  const severity = score >= 50 ? "high" : score >= 30 ? "medium" : "low";
  const hasDuplicate = expense.reasonCodes?.includes("duplicate_claim");

  const copyExpenseId = () => {
    navigator.clipboard.writeText(expense.id);
    toast.success("Expense ID copied to clipboard");
  };

  const normalizeText = (text: string): string => {
    return text?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
  };

  const normalizeDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const loadDuplicates = async () => {
    if (!expense || loadingDuplicates || duplicateExpenses.length > 0) return;
    
    setLoadingDuplicates(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const normalizedVendor = normalizeText(expense.vendor);
        const normalizedAmount = Number(expense.amount).toFixed(2);
        const normalizedDate = normalizeDate(expense.date);

        const duplicates = data.filter(exp => {
          const expVendor = normalizeText(exp.vendor);
          const expAmount = Number(exp.amount).toFixed(2);
          const expDate = normalizeDate(exp.date);
          
          return expVendor === normalizedVendor && 
                 expAmount === normalizedAmount && 
                 expDate === normalizedDate;
        });

        setDuplicateExpenses(duplicates);
      }
    } catch (error: any) {
      console.error("Error loading duplicates:", error);
      toast.error("Failed to load duplicate expenses");
    } finally {
      setLoadingDuplicates(false);
    }
  };

  useEffect(() => {
    if (showDuplicates && hasDuplicate) {
      loadDuplicates();
    }
  }, [showDuplicates, hasDuplicate]);

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
              <div className="rounded-lg bg-red-500/20 border-2 border-red-500/50">
                <Collapsible open={showDuplicates} onOpenChange={setShowDuplicates}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Copy className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-500 mb-2">⚠️ Duplicate Claim Detected</h3>
                        <p className="text-sm text-foreground mb-2">
                          This exact expense (vendor: {expense.vendor}, amount: ₹{expense.amount}, date: {format(new Date(expense.date), "PPP")}) 
                          appears <strong>{expense.duplicateInfo.count} times</strong> in the system.
                        </p>
                        <p className="text-sm font-medium text-red-500 mb-3">
                          Total duplicate amount: ₹{expense.duplicateInfo.totalAmount.toFixed(2)}
                        </p>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 hover:bg-red-500/10"
                          >
                            {showDuplicates ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Hide All {expense.duplicateInfo.count} Duplicates
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                View All {expense.duplicateInfo.count} Duplicates
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="border-t border-red-500/30 p-4 space-y-3 bg-background/50">
                      {loadingDuplicates ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          Loading duplicates...
                        </div>
                      ) : duplicateExpenses.length > 0 ? (
                        duplicateExpenses.map((dup, index) => (
                          <div 
                            key={dup.id} 
                            className={`p-3 rounded border ${
                              dup.id === expense.id 
                                ? 'bg-primary/10 border-primary' 
                                : 'bg-muted border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                                {dup.id === expense.id && (
                                  <Badge variant="default" className="text-xs">Current</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">{dup.status}</Badge>
                              </div>
                              <span className="text-sm font-bold">₹{Number(dup.amount).toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">ID:</span> {dup.id.slice(0, 8)}...
                              </div>
                              <div>
                                <span className="font-medium">Submitted:</span> {format(new Date(dup.created_at), "PP")}
                              </div>
                              <div>
                                <span className="font-medium">Date:</span> {format(new Date(dup.date), "PP")}
                              </div>
                              <div>
                                <span className="font-medium">Category:</span> {dup.category}
                              </div>
                            </div>
                            {dup.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {dup.description}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No duplicates found
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
