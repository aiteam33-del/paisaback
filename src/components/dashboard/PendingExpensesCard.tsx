import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, ChevronRight, Loader2, AlertCircle, ChevronDown, FileText, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getReceiptPublicUrl } from "@/lib/attachments";

interface PendingExpense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  employee_name: string;
  user_id: string;
  description?: string;
  attachments?: string[];
}

const categoryColors: Record<string, string> = {
  travel: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  food: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  lodging: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  office: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

export const PendingExpensesCard = () => {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPendingExpenses();
  }, []);

  const loadPendingExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      const { data: employeesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("organization_id", orgData.id);

      const employeeIds = (employeesData || []).map(e => e.id);
      const employeeLookup = new Map(
        (employeesData || []).map(e => [e.id, e.full_name])
      );

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .in("user_id", [...employeeIds, user.id])
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(4);

      const transformed = (expensesData || []).map(exp => ({
        id: exp.id,
        vendor: exp.vendor,
        amount: Number(exp.amount),
        date: exp.date,
        category: exp.category,
        employee_name: employeeLookup.get(exp.user_id) || "Unknown",
        user_id: exp.user_id,
        description: exp.description,
        attachments: exp.attachments,
      }));

      setExpenses(transformed);
    } catch (error) {
      console.error("Failed to load pending expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (expenseId: string, action: "approved" | "rejected") => {
    setActioningId(expenseId);
    const expense = expenses.find(e => e.id === expenseId);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ status: action })
        .eq("id", expenseId);

      if (error) throw error;

      if (action === "approved") {
        toast.success("Expense Approved!", {
          description: `₹${expense?.amount.toLocaleString('en-IN')} from ${expense?.vendor} has been approved`,
          duration: 4000,
        });
      } else {
        toast.error("Expense Rejected", {
          description: `${expense?.vendor} expense has been rejected`,
          duration: 4000,
        });
      }
      await loadPendingExpenses();
    } catch (error: any) {
      toast.error("Action Failed", {
        description: error?.message ?? `Failed to ${action} expense`,
      });
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Pending Review</CardTitle>
              {expenses.length > 0 && (
                <p className="text-xs text-muted-foreground">{expenses.length} awaiting action</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/expenses?status=pending");
            }}
            className="h-8 text-xs rounded-lg hover:bg-amber-500/10 hover:text-amber-600"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/60">No pending expenses</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="group/item relative rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 hover:border-amber-500/30 hover:shadow-md transition-all duration-200"
              >
                {/* Subtle left accent */}
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-amber-500 to-orange-500 opacity-60" />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover/item:text-amber-600 transition-colors">
                        {expense.vendor}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {expense.employee_name.charAt(0).toUpperCase()}
                        </span>
                        {expense.employee_name}
                      </p>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <p className="font-bold text-base">₹{expense.amount.toLocaleString('en-IN')}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize mt-1 border",
                            categoryColors[expense.category.toLowerCase()] || categoryColors.other
                          )}
                        >
                          {expense.category}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-md hover:bg-amber-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(expandedId === expense.id ? null : expense.id);
                        }}
                      >
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          expandedId === expense.id && "rotate-180"
                        )} />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Preview Section */}
                  {expandedId === expense.id && (
                    <div className="pl-3 mb-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {/* Description */}
                      {expense.description && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <FileText className="w-3 h-3" />
                            <span>Notes</span>
                          </div>
                          <p className="text-sm">{expense.description}</p>
                        </div>
                      )}

                      {/* Receipt Preview */}
                      {expense.attachments && expense.attachments.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Receipt className="w-3 h-3" />
                            <span>Receipt</span>
                          </div>
                          <div className="flex gap-2">
                            {expense.attachments.slice(0, 2).map((attachment, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(getReceiptPublicUrl(attachment), '_blank');
                                }}
                                className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 hover:border-amber-500/50 transition-colors group/img"
                              >
                                <img
                                  src={getReceiptPublicUrl(attachment)}
                                  alt="Receipt"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                  <span className="text-white text-xs opacity-0 group-hover/img:opacity-100 transition-opacity">View</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {!expense.description && (!expense.attachments || expense.attachments.length === 0) && (
                        <p className="text-xs text-muted-foreground italic pl-1">No additional details</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pl-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs rounded-lg border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(expense.id, "rejected");
                      }}
                      disabled={actioningId === expense.id}
                    >
                      {actioningId === expense.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(expense.id, "approved");
                      }}
                      disabled={actioningId === expense.id}
                    >
                      {actioningId === expense.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
