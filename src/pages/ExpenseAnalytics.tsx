import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, DollarSign, Receipt, CheckCircle, XCircle, Clock, ArrowUp, ArrowDown, ArrowLeft, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";
import { AnalyticsFilters } from "@/components/AnalyticsFilters";
import { ExpenseChart } from "@/components/ExpenseChart";
import { Button } from "@/components/ui/button";
import { startOfDay, subDays, isAfter } from "date-fns";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  status: string;
  mode_of_payment?: string;
  vendor: string;
  user_id: string;
  created_at: string;
  approved_at?: string;
}

const ExpenseAnalytics = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const isAdmin = userRole === "admin" || userRole === "manager" || userRole === "finance";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadExpenses();
  }, [user, navigate]);

  // Refresh data on page visibility/focus and via realtime updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadExpenses();
      }
    };

    const handleFocus = () => {
      loadExpenses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Realtime subscription to expenses table
    const channel = supabase
      .channel('realtime-expenses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          // Re-fetch whenever an expense is inserted/updated/deleted
          loadExpenses();
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const loadExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          const { data: employeeIds } = await supabase
            .from("profiles")
            .select("id")
            .eq("organization_id", profile.organization_id);

          if (employeeIds) {
            query = query.in("user_id", employeeIds.map(e => e.id));
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Failed to load expenses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredExpenses = () => {
    let filtered = expenses;

    if (dateRange !== "all") {
      const days = parseInt(dateRange.replace("days", ""));
      const cutoffDate = startOfDay(subDays(new Date(), days));
      filtered = filtered.filter(exp => isAfter(new Date(exp.date), cutoffDate));
    }

    if (category !== "all") {
      filtered = filtered.filter(exp => exp.category === category);
    }

    if (status !== "all") {
      filtered = filtered.filter(exp => exp.status === status);
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();

  // Calculate metrics
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const avgAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const pendingAmount = filteredExpenses.filter(e => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0);
  const approvedAmount = filteredExpenses.filter(e => e.status === "approved").reduce((sum, e) => sum + Number(e.amount), 0);
  const rejectedAmount = filteredExpenses.filter(e => e.status === "rejected").reduce((sum, e) => sum + Number(e.amount), 0);
  const paidAmount = filteredExpenses.filter(e => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0);

  const approvalRate = filteredExpenses.length > 0 
    ? ((filteredExpenses.filter(e => e.status === "approved" || e.status === "paid").length / filteredExpenses.length) * 100).toFixed(1)
    : 0;

  // Category breakdown
  const categoryData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, amount]) => ({
    category,
    name: category,
    amount,
    count: filteredExpenses.filter(e => e.category === category).length
  }));

  // Monthly trend
  const monthlyData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([month, amount]) => ({
    category: month,
    name: month,
    amount,
    count: 0
  })).slice(0, 12).reverse();

  // Status breakdown
  const statusData = [
    { category: "Pending", name: "Pending", amount: pendingAmount, count: filteredExpenses.filter(e => e.status === "pending").length },
    { category: "Approved", name: "Approved", amount: approvedAmount, count: filteredExpenses.filter(e => e.status === "approved").length },
    { category: "Paid", name: "Paid", amount: paidAmount, count: filteredExpenses.filter(e => e.status === "paid").length },
    { category: "Rejected", name: "Rejected", amount: rejectedAmount, count: filteredExpenses.filter(e => e.status === "rejected").length },
  ].filter(d => d.amount > 0);

  // Payment method breakdown
  const paymentMethodData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      if (!exp.mode_of_payment || exp.mode_of_payment.trim() === '') {
        return acc; // Skip null, undefined, or empty payment methods
      }
      const method = exp.mode_of_payment;
      acc[method] = (acc[method] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([method, amount]) => ({
    category: method,
    name: method,
    amount,
    count: filteredExpenses.filter(e => e.mode_of_payment === method).length
  }));

  // Top vendors
  const topVendors = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      acc[exp.vendor] = (acc[exp.vendor] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([vendor, amount]) => ({
      category: vendor,
      name: vendor,
      amount,
      count: filteredExpenses.filter(e => e.vendor === vendor).length
    }));

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const handleExport = () => {
    const csv = [
      ["Date", "Category", "Amount", "Status", "Vendor", "Payment Method"],
      ...filteredExpenses.map(exp => [
        exp.date,
        exp.category,
        exp.amount,
        exp.status,
        exp.vendor,
        exp.mode_of_payment || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export complete");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-analytics flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isAdmin ? "Organization Analytics" : "Expense Analytics"}
              </h1>
              <p className="text-muted-foreground">
                Insights into your spending patterns and trends
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(isAdmin ? "/admin" : "/employee")}
              className="group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
          </div>

          {/* Filters */}
          <AnalyticsFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            status={status}
            onStatusChange={setStatus}
            onExport={handleExport}
            onRefresh={loadExpenses}
          />
        </div>

        <div className="space-y-6">
          {/* Top KPI Cards - Cleaner Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="relative overflow-hidden bg-gradient-card rounded-3xl p-6 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-gradient-primary shadow-md">
                  <DollarSign className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 relative z-10">Total Expenses</p>
              <p className="text-3xl font-bold text-foreground relative z-10">₹{totalAmount.toFixed(2)}</p>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-3xl p-6 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl group-hover:opacity-100 opacity-80 transition-opacity"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-secondary/15 shadow-md">
                  <Receipt className="w-5 h-5 text-secondary" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 relative z-10">Total Count</p>
              <p className="text-3xl font-bold text-foreground relative z-10">{filteredExpenses.length}</p>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-3xl p-6 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl group-hover:opacity-100 opacity-80 transition-opacity"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-accent/15 shadow-md">
                  <TrendingUp className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 relative z-10">Average Expense</p>
              <p className="text-3xl font-bold text-foreground relative z-10">₹{avgAmount.toFixed(2)}</p>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-3xl p-6 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-trust/20 rounded-full blur-3xl group-hover:opacity-100 opacity-80 transition-opacity"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-trust/15 shadow-md">
                  <BarChart3 className="w-5 h-5 text-trust" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm",
                  Number(approvalRate) >= 80 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                )}>
                  {Number(approvalRate) >= 80 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {approvalRate}%
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 relative z-10">Approval Rate</p>
              <p className="text-3xl font-bold text-foreground relative z-10">{approvalRate}%</p>
            </div>
          </div>

          {/* Status Breakdown - Smaller Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative overflow-hidden bg-gradient-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-warning/20 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 rounded-xl bg-warning/15 shadow-sm">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Pending</p>
                  <p className="text-2xl font-bold text-foreground">₹{pendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/20 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 rounded-xl bg-success/15 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Approved</p>
                  <p className="text-2xl font-bold text-foreground">₹{approvedAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 rounded-xl bg-primary/15 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Paid</p>
                  <p className="text-2xl font-bold text-foreground">₹{paidAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-card rounded-2xl p-5 shadow-[var(--shadow-card)] border border-border/30 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/20 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 rounded-xl bg-destructive/15 shadow-sm">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Rejected</p>
                  <p className="text-2xl font-bold text-foreground">₹{rejectedAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <ExpenseChart
              data={categoryData}
              type="pie"
              title="Spending by Category"
            />
            <ExpenseChart
              data={statusData}
              type="pie"
              title="Expenses by Status"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <ExpenseChart
              data={monthlyData}
              type="bar"
              title="Monthly Spending Trend"
              height={300}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <ExpenseChart
              data={topVendors}
              type="bar"
              title="Top 10 Vendors"
            />
            {paymentMethodData.length > 0 && (
              <ExpenseChart
                data={paymentMethodData}
                type="pie"
                title="Payment Methods"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpenseAnalytics;
