import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  status?: string;
  onStatusChange?: (value: string) => void;
  showStatusFilter?: boolean;
  onExport?: () => void;
  onRefresh?: () => void;
}

export const AnalyticsFilters = ({
  dateRange,
  onDateRangeChange,
  category,
  onCategoryChange,
  categories,
  status,
  onStatusChange,
  showStatusFilter = true,
  onExport,
  onRefresh
}: AnalyticsFiltersProps) => {
  return (
    <div className="bg-gradient-card rounded-xl shadow-lg border border-border/50 backdrop-blur-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Filters</h3>
            <p className="text-sm text-muted-foreground">Customize your analytics view</p>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="hover:bg-primary/10">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="hover:bg-primary/10">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 3 months</SelectItem>
                <SelectItem value="180days">Last 6 months</SelectItem>
                <SelectItem value="365days">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showStatusFilter && onStatusChange && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status || "all"} onValueChange={onStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
