import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ExpenseData {
  category: string;
  amount: number;
  count: number;
  [key: string]: string | number;
}

interface ExpenseChartProps {
  data: ExpenseData[];
  type?: "pie" | "bar";
  title: string;
}

const COLORS = {
  travel: "hsl(var(--chart-1))",
  food: "hsl(var(--chart-2))",
  lodging: "hsl(var(--chart-3))",
  office: "hsl(var(--chart-4))",
  other: "hsl(var(--chart-5))",
};

export const ExpenseChart = ({ data, type = "pie", title }: ExpenseChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
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
                  <Cell key={`cell-${index}`} fill={COLORS[entry.category as keyof typeof COLORS] || COLORS.other} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};