import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SlackWebhookSetupProps {
  organizationId?: string;
  currentWebhook?: string;
  slackEnabled?: boolean;
}

export const SlackWebhookSetup = ({
  organizationId,
  currentWebhook = "",
  slackEnabled = false,
}: SlackWebhookSetupProps) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhook);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const testConnection = async () => {
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      toast.error("Please enter a valid Slack webhook URL");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🎉 PaisaBack Integration Test",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*PaisaBack Slack Integration*\n\nConnection test successful! You'll now receive expense notifications in this channel.",
              },
            },
          ],
        }),
      });

      if (response.ok) {
        setTestResult("success");
        toast.success("Test message sent to Slack!");
      } else {
        setTestResult("error");
        toast.error("Failed to send test message");
      }
    } catch (error) {
      setTestResult("error");
      toast.error("Connection failed. Please check your webhook URL.");
    } finally {
      setTesting(false);
    }
  };

  const saveWebhook = async () => {
    if (!organizationId) {
      toast.error("Organization ID not found");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          slack_webhook_url: webhookUrl,
          slack_enabled: true,
        })
        .eq("id", organizationId);

      if (error) throw error;

      toast.success("Slack webhook saved successfully!");
    } catch (error) {
      console.error("Error saving webhook:", error);
      toast.error("Failed to save webhook");
    } finally {
      setSaving(false);
    }
  };

  const disableSlack = async () => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ slack_enabled: false })
        .eq("id", organizationId);

      if (error) throw error;

      toast.success("Slack notifications disabled");
    } catch (error) {
      console.error("Error disabling Slack:", error);
      toast.error("Failed to disable Slack");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slack Notifications</CardTitle>
        <CardDescription>
          Get real-time expense notifications in your Slack workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium">How to get your Slack Webhook URL:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Go to api.slack.com/messaging/webhooks</li>
              <li>Click "Create your Slack app"</li>
              <li>Select your workspace</li>
              <li>Enable "Incoming Webhooks"</li>
              <li>Add new webhook to workspace</li>
              <li>Select the channel (e.g., #finance)</li>
              <li>Copy the webhook URL</li>
            </ol>
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline text-xs"
            >
              Open Slack Webhook Setup <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>

        {testResult && (
          <Alert variant={testResult === "success" ? "default" : "destructive"}>
            <AlertDescription className="flex items-center gap-2">
              {testResult === "success" ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Connection successful!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Connection failed. Check your webhook URL.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            disabled={!webhookUrl || testing}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          <Button
            onClick={saveWebhook}
            disabled={!webhookUrl || saving || testResult !== "success"}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Webhook"
            )}
          </Button>

          {slackEnabled && (
            <Button onClick={disableSlack} variant="destructive">
              Disable
            </Button>
          )}
        </div>

        {slackEnabled && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Slack notifications are active. You'll receive alerts for new expenses.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
