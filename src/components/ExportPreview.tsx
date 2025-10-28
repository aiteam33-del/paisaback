import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, FileText } from "lucide-react";

interface ExportPreviewProps {
  expenseCount: number;
  totalAmount: number;
  dateRange: { start: string; end: string };
  categories?: Record<string, number>;
  employees?: Record<string, number>;
}

export const ExportPreview = ({
  expenseCount,
  totalAmount,
  dateRange,
  categories = {},
  employees = {},
}: ExportPreviewProps) => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Export Preview
        </CardTitle>
        <CardDescription>Review the data before exporting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{expenseCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
          </span>
        </div>

        {Object.keys(categories).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              By Category
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categories).map(([category, count]) => (
                <Badge key={category} variant="secondary">
                  {category}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {Object.keys(employees).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Employee
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(employees).map(([employee, count]) => (
                <Badge key={employee} variant="outline">
                  {employee}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
