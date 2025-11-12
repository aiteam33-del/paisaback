import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ApprovedExpense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  employee_name: string;
}

export const ApprovedExpensesCard = () => {
  const [expenses, setExpenses] = useState<ApprovedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadApprovedExpenses();
  }, []);

  const loadApprovedExpenses = async () => {
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
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(4);

      const transformed = (expensesData || []).map(exp => ({
        id: exp.id,
        vendor: exp.vendor,
        amount: Number(exp.amount),
        category: exp.category,
        date: exp.date,
        employee_name: employeeLookup.get(exp.user_id) || "Unknown",
      }));

      setExpenses(transformed);
    } catch (error) {
      console.error("Failed to load approved expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="group relative shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-success/50">
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/20 group-hover:bg-success/30 transition-colors duration-300">
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <CardTitle className="text-lg">Recently Approved</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/expenses?status=approved");
            }}
            className="h-8 text-xs hover:bg-success/20"
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
            No approved expenses
          </div>
        ) : (
          <div className="space-y-2.5 flex-1">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/expenses?highlight=${expense.id}`);
                }}
                className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-gradient-card-hover hover:border-success/30 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.vendor}</p>
                    <p className="text-xs text-muted-foreground">{expense.employee_name}</p>
                  </div>
                  <p className="font-semibold text-sm ml-2">₹{expense.amount.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs h-5 bg-success/10 text-success border-success/30">
                    {expense.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
