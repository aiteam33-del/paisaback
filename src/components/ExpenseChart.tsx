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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-2">{label || payload[0].name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              Amount: <span className="font-semibold text-foreground">₹{Number(entry.value).toFixed(2)}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ExpenseChart = ({ data, type = "pie", title, height = 250 }: ExpenseChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="relative overflow-hidden bg-gradient-chart rounded-3xl border border-border/30 p-8 backdrop-blur-sm shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lg)] transition-all duration-300">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-primary opacity-5 rounded-full blur-3xl"></div>
        <h3 className="text-lg font-bold text-foreground mb-2 relative z-10">{title}</h3>
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm relative z-10">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-chart rounded-3xl border border-border/30 p-8 h-full backdrop-blur-sm shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lg)] transition-all duration-300 group">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
      <h3 className="text-lg font-bold mb-6 text-foreground relative z-10 flex items-center gap-2">
        {title}
        <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent"></div>
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {type === "pie" ? (
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <filter key={`shadow-${index}`} id={`shadow-${index}`} height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
              outerRadius={90}
              innerRadius={0}
              fill="#8884d8"
              dataKey="amount"
              paddingAngle={2}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForCategory(entry.category, index)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        ) : type === "line" ? (
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
    </div>
  );
};