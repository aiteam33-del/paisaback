import { useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PendingRequest = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Request Sent – PAISABACK";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <Card className="shadow-card text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Request Sent</CardTitle>
            <CardDescription>
              You'll be onboarded once your admin approves your request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Weve notified your organization admin. Youll receive access automatically after approval.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/onboarding")}>Change Organization</Button>
              <Button onClick={() => navigate("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PendingRequest;
