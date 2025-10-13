import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, Calendar, CreditCard, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  status: string;
  date: string;
  description: string;
  attachments?: string[];
}

interface UserInfo {
  full_name: string;
  email: string;
}

const ExpenseSummary = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const verifyTokenAndFetchExpenses = async () => {
      if (!token) {
        setError("No access token provided. Please use the link from your email.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'verify-expense-token',
          {
            body: { token }
          }
        );

        if (functionError) {
          console.error('Function error:', functionError);
          setError(functionError.message || 'Invalid or expired token');
          setLoading(false);
          return;
        }

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setUser(data.user);
        setExpenses(data.expenses);
        setLoading(false);
      } catch (err: any) {
        console.error('Error verifying token:', err);
        setError('Failed to load expense summary. Please try again or contact support.');
        setLoading(false);
      }
    };

    verifyTokenAndFetchExpenses();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading expense summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
  };

  const statusIcons: Record<string, any> = {
    pending: "⏳",
    approved: "✅",
    rejected: "❌",
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Expense Summary</CardTitle>
            <CardDescription>
              Employee: {user?.full_name} ({user?.email})
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter(e => e.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₹{expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {expenses.filter(e => e.status === 'approved').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₹{expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categoryBreakdown).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <span className="font-medium capitalize">{category}</span>
                    <span className="font-bold">₹{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>Complete list of expense claims</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{expense.vendor}</h3>
                            <p className="text-sm text-muted-foreground">{expense.description}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${statusColors[expense.status]} text-white`}
                          >
                            {statusIcons[expense.status]} {expense.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span className="capitalize">{expense.category}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                          {expense.attachments && expense.attachments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Receipt className="h-4 w-4" />
                              <span>{expense.attachments.length} attachment(s)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold">₹{Number(expense.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseSummary;
