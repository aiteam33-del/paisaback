import { ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Coffee, Plane, Home, Package, CreditCard, Utensils, Car, Building, ShoppingBag } from "lucide-react";

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

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    travel: Plane,
    food: Utensils,
    lodging: Home,
    office: Building,
    transport: Car,
    shopping: ShoppingBag,
    pending: CreditCard,
    approved: Package,
    paid: CreditCard,
    rejected: CreditCard,
  };
  
  const IconComponent = iconMap[category.toLowerCase()] || Package;
  return IconComponent;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-md">
        <p className="text-sm font-medium mb-1.5">{label || payload[0].name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              ₹{Number(entry.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ExpenseChart = ({ data, type = "pie", title, height = 250 }: ExpenseChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      
      {type === "pie" ? (
        <div>
          {/* Donut chart with category breakdown */}
          <div className="flex flex-col items-center">
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={95}
                    innerRadius={65}
                    fill="#8884d8"
                    dataKey="amount"
                    paddingAngle={3}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getColorForCategory(entry.category, index)}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-xs font-medium"
                  >
                    Overall
                  </text>
                  <text
                    x="50%"
                    y="52%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-2xl font-bold"
                  >
                    ₹{data.reduce((sum, item) => sum + item.amount, 0).toFixed(0)}
                  </text>
                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    {data.reduce((sum, item) => sum + item.count, 0)} expenses
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category breakdown with icons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 w-full">
              {data.slice(0, 6).map((entry, index) => {
                const Icon = getCategoryIcon(entry.category);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div
                      className="p-1.5 rounded"
                      style={{ backgroundColor: `${getColorForCategory(entry.category, index)}15` }}
                    >
                      <Icon
                        className="w-3.5 h-3.5"
                        style={{ color: getColorForCategory(entry.category, index) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">
                        {entry.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{Number(entry.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                  <stop offset="50%" stopColor="hsl(var(--chart-2))" />
                  <stop offset="100%" stopColor="hsl(var(--chart-3))" />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                vertical={false}
              />
              <XAxis 
                dataKey="category" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="url(#lineGradient)" 
                strokeWidth={3}
                dot={{ 
                  fill: 'hsl(var(--primary))', 
                  r: 5,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--card))'
                }}
                activeDot={{ 
                  r: 7,
                  fill: 'hsl(var(--primary))',
                  stroke: 'hsl(var(--card))',
                  strokeWidth: 3
                }}
                animationDuration={1000}
              />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                vertical={false}
              />
              <XAxis 
                dataKey="category" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fill="url(#areaGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {data.map((entry, index) => {
                  const color = getColorForCategory(entry.category, index);
                  return (
                    <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                vertical={false}
              />
              <XAxis 
                dataKey="category" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGradient-${index})`}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
};
