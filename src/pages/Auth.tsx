import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { Building2, Users, LogIn, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/AnimatedCard";

type AuthStep = 'entry' | 'general_login' | 'org_signup' | 'employee_signup';

const Auth = () => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('entry');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Org signup state
  const [orgName, setOrgName] = useState("");
  const [orgFullName, setOrgFullName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");

  // Employee signup state
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [empFullName, setEmpFullName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        const { data: orgByOwner } = await supabase
          .from("organizations")
          .select("id")
          .eq("admin_user_id", user.id)
          .maybeSingle();

        if (orgByOwner) {
          navigate("/admin");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (!profile?.organization_id) {
          navigate("/onboarding");
        } else {
          navigate("/employee");
        }
      }
    };
    
    checkUserStatus();
  }, [user, navigate]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast.error("Failed to load organizations");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleGeneralLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      // Error is already handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgEmail || !orgPassword || !orgFullName || !orgName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError, data: authData } = await supabase.auth.signUp({
        email: orgEmail,
        password: orgPassword,
        options: {
          data: { full_name: orgFullName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Ensure profile exists
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            { id: authData.user.id, email: orgEmail, full_name: orgFullName },
            { onConflict: "id" }
          );
        if (profileUpsertError) throw profileUpsertError;

        // Create organization
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName.trim(),
            admin_user_id: authData.user.id
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Update user's profile with organization
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ organization_id: org.id })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        toast.success(`Organization "${orgName}" created successfully!`);
        navigate("/admin");
      }
    } catch (error: any) {
      const msg = (error?.message || '').toLowerCase();
      const details = (error?.details || '').toLowerCase();

      if (msg.includes('already registered') || msg.includes('user already registered') || msg.includes('email')) {
        toast.error('Email is already registered');
      } else if (error?.code === '23505' && (details.includes('(name)') || msg.includes('organizations_name_key') || msg.includes('unique'))) {
        toast.error('An organization with this name already exists');
      } else {
        toast.error(error?.message || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empEmail || !empPassword || !empFullName || !selectedOrgId) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError, data: authData } = await supabase.auth.signUp({
        email: empEmail,
        password: empPassword,
        options: {
          data: { full_name: empFullName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Ensure profile exists
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            { id: authData.user.id, email: empEmail, full_name: empFullName },
            { onConflict: "id" }
          );
        if (profileUpsertError) throw profileUpsertError;

        // Join existing organization via join request
        const { error: insertError } = await supabase
          .from("join_requests")
          .insert({ employee_id: authData.user.id, org_id: selectedOrgId });

        if (insertError) throw insertError;

        const orgName = organizations.find(o => o.id === selectedOrgId)?.name;
        toast.success(`Join request sent to ${orgName}. You'll be notified when approved.`);
        navigate("/pending-request");
      }
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        toast.error("Email is already registered");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load organizations when entering employee signup
  useEffect(() => {
    if (currentStep === 'employee_signup') {
      loadOrganizations();
    }
  }, [currentStep]);

  const renderEntryScreen = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to PAISABACK</h1>
        <p className="text-lg text-muted-foreground">Choose how you'd like to get started</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary"
          onClick={() => setCurrentStep('org_signup')}
        >
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">I am an Organization</CardTitle>
            <CardDescription>
              Create a new organization and become the admin
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary"
          onClick={() => setCurrentStep('employee_signup')}
        >
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">I am an Employee</CardTitle>
            <CardDescription>
              Join an existing organization as an employee
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary"
          onClick={() => setCurrentStep('general_login')}
        >
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
              <LogIn className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">Already a user</CardTitle>
            <CardDescription>
              Log in to your account
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );

  const renderGeneralLogin = () => (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('entry')}
          className="w-fit mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <CardTitle className="text-2xl">Welcome Back! Log In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGeneralLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input 
              id="login-password" 
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderOrgSignUp = () => (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('entry')}
          className="w-fit mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <CardTitle className="text-2xl">Organization Registration</CardTitle>
        <CardDescription>
          Create a new organization and become the admin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOrgSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Inc."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-fullname">Your Full Name</Label>
            <Input 
              id="org-fullname" 
              placeholder="John Doe"
              value={orgFullName}
              onChange={(e) => setOrgFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              type="email"
              placeholder="your@email.com"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-password">Password</Label>
            <Input 
              id="org-password" 
              type="password"
              value={orgPassword}
              onChange={(e) => setOrgPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization & Sign Up"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderEmployeeSignUp = () => (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('entry')}
          className="w-fit mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <CardTitle className="text-2xl">Join Your Team</CardTitle>
        <CardDescription>
          Request to join an existing organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmployeeSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-org-select">Select Organization</Label>
            {loadingOrgs ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md">
                No organizations found
              </p>
            ) : (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={isLoading}>
                <SelectTrigger id="emp-org-select">
                  <SelectValue placeholder="Choose your organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-fullname">Full Name</Label>
            <Input 
              id="emp-fullname" 
              placeholder="John Doe"
              value={empFullName}
              onChange={(e) => setEmpFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              placeholder="your@email.com"
              value={empEmail}
              onChange={(e) => setEmpEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-password">Password</Label>
            <Input 
              id="emp-password" 
              type="password"
              value={empPassword}
              onChange={(e) => setEmpPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isLoading || organizations.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Request...
              </>
            ) : (
              "Request to Join"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        {currentStep === 'entry' && renderEntryScreen()}
        {currentStep === 'general_login' && renderGeneralLogin()}
        {currentStep === 'org_signup' && renderOrgSignUp()}
        {currentStep === 'employee_signup' && renderEmployeeSignUp()}
      </main>
    </div>
  );
};

export default Auth;