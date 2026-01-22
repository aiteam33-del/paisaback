import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Loader2, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const FinancialOverviewCard = () => {
  const [data, setData] = useState({
    totalPending: 0,
    totalApproved: 0,
    pendingCount: 0,
    approvedCount: 0,
    pendingTrend: 5,
    approvedTrend: 12,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
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
        .select("id")
        .eq("organization_id", orgData.id);

      const employeeIds = (employeesData || []).map(e => e.id);

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, status")
        .in("user_id", [...employeeIds, user.id]);

      const pending = (expensesData || []).filter(exp => exp.status === "pending");
      const approved = (expensesData || []).filter(exp => exp.status === "approved");

      const totalPending = pending.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const totalApproved = approved.reduce((sum, exp) => sum + Number(exp.amount), 0);

      setData({
        totalPending,
        totalApproved,
        pendingCount: pending.length,
        approvedCount: approved.length,
        pendingTrend: 5,
        approvedTrend: 12,
      });
    } catch (error) {
      console.error("Failed to load financial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalVolume = data.totalPending + data.totalApproved;

  // Format number to fit: use compact notation for large numbers
  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <Card
      onClick={() => navigate("/admin/analytics")}
      className="h-full cursor-pointer relative overflow-hidden group hover:shadow-lg transition-all duration-300"
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Financial Overview</CardTitle>
              <p className="text-xs text-muted-foreground">Click to view analytics</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
          </div>
        ) : (
          <>
            {/* Total Volume - Hero stat */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Volume</span>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{data.approvedTrend}%</span>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">
                ₹{formatAmount(totalVolume)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.pendingCount + data.approvedCount} total expenses
              </p>
            </div>

            {/* Pending & Approved Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pending */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Pending</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
                  ₹{formatAmount(data.totalPending)}
                </p>
                <p className="text-xs text-muted-foreground">{data.pendingCount} expenses</p>
              </div>

              {/* Approved */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Approved</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  ₹{formatAmount(data.totalApproved)}
                </p>
                <p className="text-xs text-muted-foreground">{data.approvedCount} expenses</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Approval Rate</span>
                <span className="font-medium">
                  {data.pendingCount + data.approvedCount > 0
                    ? Math.round((data.approvedCount / (data.pendingCount + data.approvedCount)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{
                    width: `${data.pendingCount + data.approvedCount > 0
                      ? (data.approvedCount / (data.pendingCount + data.approvedCount)) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
