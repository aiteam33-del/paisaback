import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PendingExpense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  employee_name: string;
  user_id: string;
}

export const PendingExpensesCard = () => {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
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
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ status: action })
        .eq("id", expenseId);

      if (error) throw error;

      toast.success(`Expense ${action} successfully`);
      await loadPendingExpenses();
    } catch (error: any) {
      toast.error(error?.message ?? `Failed to ${action} expense`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Card className="group relative shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-warning/50">
      <div className="absolute inset-0 bg-gradient-warning opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/20 group-hover:bg-warning/30 transition-colors duration-300">
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <CardTitle className="text-lg">Pending Review</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/expenses?status=pending");
            }}
            className="h-8 text-xs hover:bg-warning/20"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm py-8">
            No pending expenses
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/expenses?highlight=${expense.id}`);
                }}
                className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-gradient-card-hover hover:border-warning/30 transition-all duration-300 hover:shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.vendor}</p>
                    <p className="text-xs text-muted-foreground">{expense.employee_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₹{expense.amount.toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs h-5 bg-warning/10 text-warning border-warning/30 mt-1">
                      {expense.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300"
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
                    className="flex-1 h-7 text-xs bg-success hover:bg-success/90 text-white transition-all duration-300"
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
