import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ApprovedExpense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  employee_name: string;
}

const categoryColors: Record<string, string> = {
  travel: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  food: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  lodging: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  office: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

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
    <Card className="h-full flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Recently Approved</CardTitle>
              {expenses.length > 0 && (
                <p className="text-xs text-muted-foreground">{expenses.length} latest approvals</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/expenses?status=approved");
            }}
            className="h-8 text-xs rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
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
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No approved expenses</p>
            <p className="text-xs text-muted-foreground/60">Approved items will appear here</p>
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
                className="group/item relative p-3 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 hover:border-emerald-500/30 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* Subtle left accent */}
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-green-500 opacity-60" />

                <div className="flex items-center justify-between mb-2 pl-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover/item:text-emerald-600 transition-colors">
                      {expense.vendor}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                        {expense.employee_name.charAt(0).toUpperCase()}
                      </span>
                      {expense.employee_name}
                    </p>
                  </div>
                  <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 ml-2">
                    ₹{expense.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center justify-between pl-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] capitalize border",
                      categoryColors[expense.category.toLowerCase()] || categoryColors.other
                    )}
                  >
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
