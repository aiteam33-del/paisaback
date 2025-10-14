import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Receipt, Sparkles, TrendingUp, Shield, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-image-modern.png";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user && userRole) {
      // Redirect logged-in users to their appropriate dashboard
      if (userRole === 'employee') {
        navigate('/employee');
      } else if (userRole === 'manager' || userRole === 'finance' || userRole === 'admin') {
        navigate('/organization');
      }
    }
  }, [user, userRole, navigate]);
  const features = [
    {
      icon: Receipt,
      title: "Snap, Scan, Done",
      subtitle: "AI Receipt Capture",
      description: "Just snap a photo. Our AI instantly extracts amount, vendor, date, and category—no manual typing.",
    },
    {
      icon: Sparkles,
      title: "Automatic Smart Categories",
      subtitle: "No More Manual Coding",
      description: "AI intelligently categorizes expenses instantly, saving hours of manual work every month.",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Insights",
      subtitle: "Spending Analytics Dashboard",
      description: "Track spending patterns, approval times, and team expenses with beautiful, actionable dashboards.",
    },
    {
      icon: Shield,
      title: "Multi-Level Approvals",
      subtitle: "Compliant & Customizable",
      description: "Set up custom approval workflows from manager to finance—ensuring full compliance every time.",
    },
    {
      icon: Zap,
      title: "Lightning Fast Processing",
      subtitle: "Submit in Seconds",
      description: "Submit expenses in under 10 seconds. Get approvals in minutes, not days. Focus on what matters.",
    },
    {
      icon: CheckCircle2,
      title: "Seamless Integration",
      subtitle: "Works With Your Tools",
      description: "Email automation for non-registered organizations. Integrates smoothly with your existing workflow.",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">AI-Powered Expense Management</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Automate Your Expenses.{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Get Reimbursed with AI
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                PAISABACK eliminates the hassle of expense claims with AI-powered receipt scanning, 
                smart categorization, and instant approval workflows. Submit in seconds, not hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 border border-accent/30">
                  <span className="text-sm font-medium">📧 Currently supports Gmail only</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-hero opacity-10 blur-3xl rounded-full animate-pulse"></div>
              <img
                src={heroImage}
                alt="PAISABACK AI-powered expense management showing receipt scanning in action"
                className="relative rounded-2xl shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Everything You Need for Effortless Expense Management
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              From AI-powered receipt scanning to multi-level approvals, PAISABACK streamlines 
              every step of the reimbursement process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <CardHeader className="space-y-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-all">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1">{feature.title}</CardTitle>
                      <div className="text-sm font-medium text-primary">{feature.subtitle}</div>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <Card className="shadow-xl bg-gradient-hero text-primary-foreground overflow-hidden relative border-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-glow/20 rounded-full blur-3xl"></div>
            <CardContent className="relative py-16 md:py-20 px-8 text-center">
              <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Ready to Transform Your Expense Process?
                </h2>
                <p className="text-lg md:text-xl text-primary-foreground/90">
                  Join thousands of employees and organizations saving time and money with PAISABACK. 
                  Start your free trial today—no credit card required.
                </p>
                <div className="pt-6">
                  <Link to="/auth">
                    <Button 
                      size="lg" 
                      className="bg-card text-foreground hover:bg-card/90 text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">PAISABACK</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 PAISABACK. All rights reserved.
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
