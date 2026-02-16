import { useState, useEffect } from "react";
import { Loader2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Rectangle,
} from "recharts";

interface MonthlySpend {
  month: string;
  amount: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

const CHART_COLORS = [
  "hsl(173, 80%, 40%)",  // primary teal
  "hsl(238, 84%, 67%)",  // secondary indigo
  "hsl(38, 92%, 50%)",   // amber
  "hsl(280, 87%, 65%)",  // purple
  "hsl(0, 84%, 60%)",    // red
  "hsl(199, 89%, 48%)",  // blue
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-card shadow-lg rounded-lg px-3 py-2 border border-border/50 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold">
          ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

export const FinancialInsightsCharts = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlySpend[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [approvalRate, setApprovalRate] = useState({ approved: 0, pending: 0, rejected: 0 });
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
      const allUserIds = [...employeeIds, user.id];

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, status, category, date")
        .in("user_id", allUserIds);

      const expenses = expensesData || [];

      // Monthly spend (last 6 months)
      const monthMap = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap.set(key, 0);
      }
      expenses.forEach(exp => {
        if (exp.status === "approved" || exp.status === "pending") {
          const d = new Date(exp.date);
          const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          if (monthMap.has(key)) {
            monthMap.set(key, (monthMap.get(key) || 0) + Number(exp.amount));
          }
        }
      });
      setMonthlyData(Array.from(monthMap.entries()).map(([month, amount]) => ({ month, amount })));

      // Category breakdown
      const catMap = new Map<string, number>();
      expenses.forEach(exp => {
        const cat = exp.category || "Other";
        catMap.set(cat, (catMap.get(cat) || 0) + Number(exp.amount));
      });
      const sortedCats = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], i) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: CHART_COLORS[i % CHART_COLORS.length],
        }));
      setCategoryData(sortedCats);

      // Approval rate
      const approved = expenses.filter(e => e.status === "approved").length;
      const pending = expenses.filter(e => e.status === "pending").length;
      const rejected = expenses.filter(e => e.status === "rejected").length;
      setApprovalRate({ approved, pending, rejected });
    } catch (error) {
      console.error("Failed to load financial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const total = approvalRate.approved + approvalRate.pending + approvalRate.rejected;
  const approvalPct = total > 0 ? Math.round((approvalRate.approved / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((approvalRate.pending / total) * 100) : 0;
  const rejectedPct = total > 0 ? Math.round((approvalRate.rejected / total) * 100) : 0;

  const donutTotal = categoryData.reduce((s, c) => s + c.value, 0);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-6 h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm h-full flex flex-col">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-foreground">Financial Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Spend analytics overview</p>
        </div>
        <button
          onClick={() => navigate("/admin/analytics")}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Full analytics
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-6">
        {/* Spend Over Time - Area Chart */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Spend Over Time</p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(173, 80%, 40%)"
                  strokeWidth={2}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown - Donut */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Category Breakdown</p>
          <div className="flex items-center gap-4">
            <div className="w-[120px] h-[120px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                    contentStyle={{
                      background: "white",
                      border: "1px solid hsl(214, 32%, 91%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{cat.name}</span>
                  <span className="text-xs font-medium tabular-nums">
                    {donutTotal > 0 ? Math.round((cat.value / donutTotal) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approval Rate - Horizontal Bar */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Approval Rate</p>
          <div className="space-y-2.5">
            {[
              { label: "Approved", pct: approvalPct, count: approvalRate.approved, color: "bg-emerald-500" },
              { label: "Pending", pct: pendingPct, count: approvalRate.pending, color: "bg-amber-400" },
              { label: "Rejected", pct: rejectedPct, count: approvalRate.rejected, color: "bg-red-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium tabular-nums">{item.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
