import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, LogIn, ArrowLeft, Loader2, Sparkles, Eye, EyeOff, Moon, Sun, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-provider";

type AuthStep = 'entry' | 'general_login' | 'org_signup' | 'employee_signup';

const Auth = () => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('entry');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

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

  // Theme toggle
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

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

        if (profile?.organization_id) {
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
        .rpc("get_organizations_for_joining");

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
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            { id: authData.user.id, email: orgEmail, full_name: orgFullName },
            { onConflict: "id" }
          );
        if (profileUpsertError) throw profileUpsertError;

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName.trim(),
            admin_user_id: authData.user.id
          })
          .select()
          .single();

        if (orgError) throw orgError;

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
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            { id: authData.user.id, email: empEmail, full_name: empFullName },
            { onConflict: "id" }
          );
        if (profileUpsertError) throw profileUpsertError;

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

  useEffect(() => {
    if (currentStep === 'employee_signup') {
      loadOrganizations();
    }
  }, [currentStep]);

  const renderEntryScreen = () => (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold">PAISABACK</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-muted-foreground text-sm">Choose how you'd like to get started</p>
      </div>

      <div className="space-y-3">
        {/* Organization option */}
        <button
          onClick={() => setCurrentStep('org_signup')}
          className="w-full group p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary to-cyan-500">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-0.5">Create Organization</h3>
              <p className="text-xs text-muted-foreground">Set up your company and become an admin</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>

        {/* Employee option */}
        <button
          onClick={() => setCurrentStep('employee_signup')}
          className="w-full group p-4 rounded-xl border border-border bg-card hover:border-violet-500/50 hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-0.5">Join as Employee</h3>
              <p className="text-xs text-muted-foreground">Request to join an existing organization</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
          </div>
        </button>

        {/* Login option */}
        <button
          onClick={() => setCurrentStep('general_login')}
          className="w-full group p-4 rounded-xl border border-border bg-card hover:border-emerald-500/50 hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-0.5">Sign In</h3>
              <p className="text-xs text-muted-foreground">Already have an account? Log in here</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>
      </div>

      {/* Back to home */}
      <div className="mt-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );

  const renderGeneralLogin = () => (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={() => setCurrentStep('entry')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Welcome Back</h2>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleGeneralLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-sm">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@company.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-sm">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium"
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
      </div>
    </div>
  );

  const renderOrgSignUp = () => (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={() => setCurrentStep('entry')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Create Organization</h2>
          <p className="text-sm text-muted-foreground">Set up your company account</p>
        </div>

        <form onSubmit={handleOrgSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-sm">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Inc."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-fullname" className="text-sm">Your Full Name</Label>
            <Input
              id="org-fullname"
              placeholder="John Doe"
              value={orgFullName}
              onChange={(e) => setOrgFullName(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-email" className="text-sm">Email</Label>
            <Input
              id="org-email"
              type="email"
              placeholder="you@company.com"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-password" className="text-sm">Password</Label>
            <div className="relative">
              <Input
                id="org-password"
                type={showPassword ? "text" : "password"}
                value={orgPassword}
                onChange={(e) => setOrgPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-600 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization"
            )}
          </Button>
        </form>
      </div>
    </div>
  );

  const renderEmployeeSignUp = () => (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={() => setCurrentStep('entry')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Join Your Team</h2>
          <p className="text-sm text-muted-foreground">Request to join an organization</p>
        </div>

        <form onSubmit={handleEmployeeSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-org-select" className="text-sm">Organization</Label>
            {loadingOrgs ? (
              <div className="flex items-center justify-center h-11 rounded-lg border border-border bg-muted/30">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : organizations.length === 0 ? (
              <div className="flex items-center justify-center h-11 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No organizations found
              </div>
            ) : (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={isLoading}>
                <SelectTrigger id="emp-org-select" className="h-11">
                  <SelectValue placeholder="Choose organization" />
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
            <Label htmlFor="emp-fullname" className="text-sm">Full Name</Label>
            <Input
              id="emp-fullname"
              placeholder="John Doe"
              value={empFullName}
              onChange={(e) => setEmpFullName(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-email" className="text-sm">Email</Label>
            <Input
              id="emp-email"
              type="email"
              placeholder="you@email.com"
              value={empEmail}
              onChange={(e) => setEmpEmail(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-password" className="text-sm">Password</Label>
            <div className="relative">
              <Input
                id="emp-password"
                type={showPassword ? "text" : "password"}
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium"
            disabled={isLoading || organizations.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Request to Join"
            )}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg"
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {currentStep === 'entry' && renderEntryScreen()}
      {currentStep === 'general_login' && renderGeneralLogin()}
      {currentStep === 'org_signup' && renderOrgSignUp()}
      {currentStep === 'employee_signup' && renderEmployeeSignUp()}
    </div>
  );
};

export default Auth;
