import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExportPreview } from "./ExportPreview";
import { SlackWebhookSetup } from "./SlackWebhookSetup";

interface IntegrationHubProps {
  organizationId?: string;
}

export const IntegrationHub = ({ organizationId }: IntegrationHubProps) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);

  useEffect(() => {
    loadExportHistory();
    loadOrganizationSettings();
  }, [organizationId]);

  const loadOrganizationSettings = async () => {
    if (!organizationId) return;

    const { data, error } = await supabase
      .from("organizations")
      .select("slack_webhook_url, slack_enabled")
      .eq("id", organizationId)
      .single();

    if (data) {
      setSlackWebhook(data.slack_webhook_url || "");
      setSlackEnabled(data.slack_enabled || false);
    }
  };

  const loadExportHistory = async () => {
    if (!organizationId) return;

    const { data, error } = await supabase
      .from("integration_exports")
      .select("*")
      .eq("organization_id", organizationId)
      .order("export_date", { ascending: false })
      .limit(10);

    if (data) {
      setExportHistory(data);
    }
  };

  const loadPreview = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    setLoading(true);

    try {
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*, profiles!expenses_user_id_fkey(full_name)")
        .eq("status", "approved")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (error) throw error;

      const categories: Record<string, number> = {};
      const employees: Record<string, number> = {};
      let totalAmount = 0;

      expenses?.forEach((exp: any) => {
        categories[exp.category] = (categories[exp.category] || 0) + 1;
        const empName = exp.profiles?.full_name || "Unknown";
        employees[empName] = (employees[empName] || 0) + 1;
        totalAmount += Number(exp.amount);
      });

      setPreviewData({
        expenseCount: expenses?.length || 0,
        totalAmount,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        categories,
        employees,
      });
    } catch (error) {
      console.error("Error loading preview:", error);
      toast.error("Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: "tally" | "quickbooks" | "zoho") => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    setLoading(true);

    try {
      const functionName =
        type === "tally"
          ? "export-tally-xml"
          : type === "quickbooks"
          ? "export-quickbooks-iif"
          : "export-zoho-csv";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });

      if (error) throw error;

      // Create a blob and download
      const blob = new Blob([data], {
        type:
          type === "tally"
            ? "application/xml"
            : type === "quickbooks"
            ? "text/plain"
            : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export-${format(new Date(), "yyyy-MM-dd")}.${
        type === "tally" ? "xml" : type === "quickbooks" ? "iif" : "csv"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} export downloaded!`);
      loadExportHistory();
    } catch (error) {
      console.error(`Error exporting to ${type}:`, error);
      toast.error(`Failed to export to ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarExport = async (reminderType: "weekly" | "monthly") => {
    setLoading(true);

    try {
      const reminderDate = new Date();
      if (reminderType === "monthly") {
        reminderDate.setDate(30);
      } else {
        reminderDate.setDate(reminderDate.getDate() + ((5 - reminderDate.getDay() + 7) % 7));
      }

      const { data, error } = await supabase.functions.invoke("generate-calendar-ics", {
        body: {
          reminder_date: reminderDate.toISOString(),
          reminder_type: reminderType,
        },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paisaback-reminders-${format(new Date(), "yyyy-MM-dd")}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Calendar reminder downloaded! Import it to Google Calendar.");
    } catch (error) {
      console.error("Error generating calendar:", error);
      toast.error("Failed to generate calendar reminder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export to Accounting Tools</CardTitle>
              <CardDescription>
                Download approved expenses in formats compatible with Tally, QuickBooks, and Zoho Books
              </CardDescription>
              <Alert className="mt-4">
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">📋 Tally Import Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Export XML file below</li>
                    <li>Open Tally → Gateway of Tally → Import Data → Vouchers</li>
                    <li>Select the downloaded XML file</li>
                    <li>Review and confirm import</li>
                  </ol>
                  <p className="text-xs mt-2 text-muted-foreground">
                    ⚠️ <strong>Important:</strong> Ensure ledger names like "Expense Reimbursement" and category-based ledgers 
                    (e.g., "Food Expenses", "Travel Expenses") exist in your Tally company before importing.
                  </p>
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button onClick={loadPreview} disabled={loading || !startDate || !endDate} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Preview Export
              </Button>

              {previewData && <ExportPreview {...previewData} />}

              {previewData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                  <Button onClick={() => handleExport("tally")} disabled={loading} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Tally
                  </Button>
                  <Button onClick={() => handleExport("quickbooks")} disabled={loading} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to QuickBooks
                  </Button>
                  <Button onClick={() => handleExport("zoho")} disabled={loading} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Zoho Books
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>Your recent exports</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No exports yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    exportHistory.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{format(new Date(exp.export_date), "PPP")}</TableCell>
                        <TableCell className="capitalize">{exp.export_type}</TableCell>
                        <TableCell>{exp.expense_count}</TableCell>
                        <TableCell>₹{Number(exp.total_amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <SlackWebhookSetup organizationId={organizationId} currentWebhook={slackWebhook} slackEnabled={slackEnabled} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Reminders</CardTitle>
              <CardDescription>
                Download calendar events for expense approval deadlines. Import the .ics file into Google Calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button onClick={() => handleCalendarExport("weekly")} disabled={loading} variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Weekly Reminders (Every Friday)
                </Button>
                <Button onClick={() => handleCalendarExport("monthly")} disabled={loading} variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Monthly Reminders (30th of Month)
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">How to import to Google Calendar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Download the .ics file</li>
                    <li>Open Google Calendar</li>
                    <li>Click Settings (gear icon) → Import & Export</li>
                    <li>Click "Select file from your computer"</li>
                    <li>Choose the downloaded .ics file</li>
                    <li>Select which calendar to add it to</li>
                    <li>Click "Import"</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
