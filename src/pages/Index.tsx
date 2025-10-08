import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Receipt, Sparkles, TrendingUp, Shield, Zap, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-image.png";

const Index = () => {
  const features = [
    {
      icon: Receipt,
      title: "AI Receipt Scanning",
      description: "Scan receipts with your phone. AI auto-extracts amount, vendor, and category instantly.",
    },
    {
      icon: Sparkles,
      title: "Smart Categorization",
      description: "Expenses are intelligently categorized using AI, saving you time and effort.",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description: "Track spending patterns, approval times, and team expenses with beautiful dashboards.",
    },
    {
      icon: Shield,
      title: "Multi-Level Approval",
      description: "Customizable approval workflows from manager to finance to ensure compliance.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Submit expenses in seconds. Get approvals in minutes. Focus on what matters.",
    },
    {
      icon: CheckCircle2,
      title: "Seamless Integration",
      description: "Works with your existing tools. Email automation for non-registered organizations.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main>
        <section className="container mx-auto px-4 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered Reimbursement</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Get Your Money Back,{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">Faster</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                PAISABACK streamlines expense claims with AI-powered receipt scanning, smart categorization, 
                and seamless approval workflows. Submit expenses in seconds, not minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/employee">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
              <img
                src={heroImage}
                alt="PAISABACK expense management dashboard"
                className="relative rounded-2xl shadow-lg w-full"
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need for Expense Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-powered receipt scanning to multi-level approvals, PAISABACK has all the tools 
              to make reimbursements effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="shadow-card hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <Card className="shadow-lg bg-gradient-primary text-primary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
            <CardContent className="relative py-16 px-8 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Expense Process?</h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                Join thousands of employees and organizations saving time and money with PAISABACK.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 PAISABACK. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
