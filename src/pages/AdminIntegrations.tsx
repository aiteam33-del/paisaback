import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationHub } from "@/components/IntegrationHub";
import { Navigation } from "@/components/ui/navigation";

const AdminIntegrations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadOrganization();
  }, [user, navigate]);

  const loadOrganization = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }
    } catch (error) {
      console.error("Error loading organization:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Integration Hub
            </h1>
            <p className="text-muted-foreground text-lg">
              Export expenses to accounting tools and configure notifications
            </p>
          </div>
        </div>

        <IntegrationHub organizationId={organizationId} />
      </div>
    </div>
  );
};

export default AdminIntegrations;
