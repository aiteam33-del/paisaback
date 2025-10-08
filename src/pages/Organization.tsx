import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/navigation";
import { TrendingUp, Users, Clock, CheckCircle2, XCircle, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Organization = () => {
  const [expenses] = useState([
    {
      id: 1,
      employee: "Rahul Sharma",
      vendor: "Uber",
      amount: 450,
      category: "Travel",
      status: "pending",
      date: "2025-01-15",
    },
    {
      id: 2,
      employee: "Priya Patel",
      vendor: "Hotel Taj",
      amount: 5200,
      category: "Lodging",
      status: "pending",
      date: "2025-01-14",
    },
    {
      id: 3,
      employee: "Amit Kumar",
      vendor: "Restaurant",
      amount: 850,
      category: "Food",
      status: "approved",
      date: "2025-01-13",
    },
  ]);

  const stats = [
    { label: "Pending Approvals", value: "2", icon: Clock, color: "text-warning" },
    { label: "Approved Today", value: "5", icon: CheckCircle2, color: "text-success" },
    { label: "Total This Month", value: "₹45,200", icon: TrendingUp, color: "text-primary" },
    { label: "Active Employees", value: "24", icon: Users, color: "text-accent" },
  ];

  const statusColors = {
    pending: "bg-warning/20 text-warning border-warning/30",
    approved: "bg-success/20 text-success border-success/30",
    rejected: "bg-destructive/20 text-destructive border-destructive/30",
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Organization Dashboard</h1>
          <p className="text-muted-foreground">Review and approve expense claims</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Expense Approvals</CardTitle>
                <CardDescription>Review and approve employee expense claims</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {expense.employee.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{expense.employee}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.vendor} • {expense.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13">
                      <Badge variant="outline" className={statusColors[expense.status as keyof typeof statusColors]}>
                        {expense.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                        {expense.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {expense.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                        <span className="capitalize">{expense.status}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">{expense.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-semibold text-foreground">₹{expense.amount}</p>
                    {expense.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Organization;
