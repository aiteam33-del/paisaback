import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { Upload, Receipt, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Employee = () => {
  const [expenses] = useState([
    { id: 1, vendor: "Uber", amount: 450, category: "Travel", status: "approved", date: "2025-01-15" },
    { id: 2, vendor: "Hotel Taj", amount: 5200, category: "Lodging", status: "pending", date: "2025-01-14" },
    { id: 3, vendor: "Restaurant", amount: 850, category: "Food", status: "rejected", date: "2025-01-13" },
  ]);

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle2 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Employee Dashboard</h1>
          <p className="text-muted-foreground">Submit and track your expense claims</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Submit New Expense
              </CardTitle>
              <CardDescription>Upload receipt and fill in the details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drop receipt here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will auto-extract details
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor Name</Label>
                <Input id="vendor" placeholder="e.g., Uber, Hotel Taj" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="lodging">Lodging</SelectItem>
                      <SelectItem value="office">Office Supplies</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Add notes about this expense..." rows={3} />
              </div>

              <Button className="w-full bg-gradient-primary hover:opacity-90">
                Submit for Approval
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Track your submissions and approvals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">{expense.vendor}</p>
                        <Badge variant="outline" className={statusColors[expense.status as keyof typeof statusColors]}>
                          {statusIcons[expense.status as keyof typeof statusIcons]}
                          <span className="ml-1 capitalize">{expense.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {expense.category} • {expense.date}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-foreground">₹{expense.amount}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card bg-gradient-primary text-primary-foreground">
              <CardHeader>
                <CardTitle>Total Reimbursements</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  This month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">₹6,500</p>
                <p className="text-sm text-primary-foreground/80 mt-2">
                  3 approved • 1 pending
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Employee;
