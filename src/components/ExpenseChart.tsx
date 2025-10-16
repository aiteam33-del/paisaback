import { ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

interface ExpenseData {
  category: string;
  amount: number;
  count: number;
  [key: string]: string | number;
}

interface ExpenseChartProps {
  data: ExpenseData[];
  type?: "pie" | "bar" | "line" | "area";
  title: string;
  height?: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const getColorForCategory = (category: string, index: number): string => {
  // Map common categories to specific colors
  const colorMap: Record<string, string> = {
    travel: CHART_COLORS[0],
    food: CHART_COLORS[1],
    lodging: CHART_COLORS[2],
    office: CHART_COLORS[3],
    pending: "hsl(var(--warning))",
    approved: "hsl(var(--success))",
    paid: "hsl(var(--primary))",
    rejected: "hsl(var(--destructive))",
  };
  
  return colorMap[category.toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length];
};

export const ExpenseChart = ({ data, type = "pie", title, height = 250 }: ExpenseChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6 h-full">
      <h3 className="text-base font-semibold mb-6 text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorForCategory(entry.category, index)} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `₹${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        ) : type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => `₹${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => `₹${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))" 
              fillOpacity={0.3}
            />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => `₹${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="amount" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};