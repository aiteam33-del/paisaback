import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Receipt, Camera, CheckCircle2, TrendingUp, Users, Banknote, BarChart3, Clock, Shield, ArrowRight, AlertCircle, FileX, DollarSign, Upload, Sparkles, Wallet, Bell, ClipboardCheck, PieChart, Lock, Instagram, Linkedin } from "lucide-react";
import heroImage from "@/assets/hero-image-modern.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { WaitlistPopup } from "@/components/WaitlistPopup";
import { FloatingWaitlistButton } from "@/components/FloatingWaitlistButton";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { ProductDemoVideo } from "@/components/ProductDemoVideo";
import { TestimonialCard } from "@/components/TestimonialCard";
import { TrustBadge } from "@/components/TrustBadge";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [activeCompanyStep, setActiveCompanyStep] = useState(0);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [hasShownWaitlist, setHasShownWaitlist] = useState(false);

  const employeeSection = useScrollAnimation();
  const companySection = useScrollAnimation();
  const advancedFeaturesSection = useScrollAnimation();
  const problemSection = useScrollAnimation();
  const solutionSection = useScrollAnimation();
  const pricingSection = useScrollAnimation();
  const benefitsSection = useScrollAnimation();
  const ctaSection = useScrollAnimation();
  const testimonialSection = useScrollAnimation();

  const demoSteps = [
    {
      icon: Upload,
      title: "Upload Receipt",
      description: "Snap a photo or upload your expense receipt instantly",
      color: "from-blue-500 to-cyan-500",
      delay: 0,
    },
    {
      icon: Sparkles,
      title: "AI Analysis",
      description: "Our AI extracts amount, vendor, date, and auto-categorizes",
      color: "from-purple-500 to-pink-500",
      delay: 200,
    },
    {
      icon: Wallet,
      title: "Get Reimbursed",
      description: "Approval in one click, money back in your account fast",
      color: "from-green-500 to-emerald-500",
      delay: 400,
    },
  ];

  const companySteps = [
    {
      icon: Bell,
      title: "Receive Claims",
      description: "Get instant notifications when employees submit expenses",
      color: "from-orange-500 to-amber-500",
      delay: 0,
    },
    {
      icon: ClipboardCheck,
      title: "Review & Approve",
      description: "Single-click approval workflow with complete audit trail",
      color: "from-indigo-500 to-blue-500",
      delay: 200,
    },
    {
      icon: PieChart,
      title: "Track & Analyze",
      description: "Real-time analytics on spending patterns and team expenses",
      color: "from-teal-500 to-green-500",
      delay: 400,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % demoSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCompanyStep((prev) => (prev + 1) % companySteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasShownWaitlist || user) return;
    const timer = setTimeout(() => {
      setIsWaitlistOpen(true);
      setHasShownWaitlist(true);
    }, 15000);
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage >= 70 && !hasShownWaitlist) {
        setIsWaitlistOpen(true);
        setHasShownWaitlist(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasShownWaitlist, user]);

  useEffect(() => {
    const route = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.organization_id) {
        const { data: pending } = await supabase
          .from("join_requests")
          .select("id")
          .eq("employee_id", user.id)
          .eq("status", "pending")
          .maybeSingle();
        if (pending) {
          navigate('/pending-request');
          return;
        }
        navigate('/auth');
        return;
      }
      if (userRole) {
        if (userRole === 'admin' || userRole === 'manager' || userRole === 'finance') {
          navigate('/organization');
          return;
        }
        navigate('/employee');
      }
    };
    route();
  }, [user, userRole, navigate]);

  const problems = [
    { icon: FileX, title: "Lost Expenses", description: "Employees forget to claim small, recurring costs" },
    { icon: DollarSign, title: "Financial Burden", description: "Team members bear unnecessary personal losses" },
    { icon: AlertCircle, title: "Manual Chaos", description: "HR teams chase scattered claims and paperwork" },
  ];

  const solutions = [
    { icon: Camera, title: "Expense Tracking", description: "Employees capture and submit expenses instantly with photo upload and OCR" },
    { icon: CheckCircle2, title: "Smart Approval", description: "Org-level admins review, approve, or reject claims with a single click" },
    { icon: BarChart3, title: "Powerful Insights", description: "Company-wide dashboard with category-wise, employee-wise, and total spend analytics" },
  ];

  const pricingPlans = [
    { name: "Early Stage", price: "₹599", period: "/month", description: "Perfect for teams up to 20 employees", popular: false },
    { name: "Growing Team", price: "₹1,099", period: "/month", description: "Ideal for teams up to 50 employees", popular: true },
    { name: "Enterprise", price: "₹1,299", period: "/month", description: "Built for teams of 50+ employees", popular: false },
  ];

  const benefits = [
    { icon: Users, role: "Employees", benefit: "Quick expense logging and faster reimbursements" },
    { icon: Banknote, role: "Finance Teams", benefit: "Streamlined approval workflows and audit trails" },
    { icon: Shield, role: "HR Leaders", benefit: "Complete visibility into company spending patterns" },
  ];

  const testimonials = [
    { quote: "PAISABACK transformed how our team handles reimbursements. No more lost receipts or delayed payments!", name: "Priya Sharma", role: "Operations Manager, Tech Startup" },
    { quote: "The AI automatically categorizes expenses and saves us hours every week. Game changer for our finance team.", name: "Rahul Mehta", role: "CFO, Growing SaaS Company" },
    { quote: "Finally, a reimbursement solution built for Indian startups. Simple, fast, and exactly what we needed.", name: "Anjali Desai", role: "HR Lead, Early-Stage Startup" },
  ];

  const advancedFeatures = [
    {
      icon: BarChart3,
      title: "Real-Time Analytics & Insights",
      description: "Visualize spending patterns with interactive charts. Track expenses by category, employee, department, and time periods.",
      benefits: ["Category-wise expense breakdown", "Employee spending trends", "Department-level analytics", "Custom date range filtering", "One-click report exports"],
      color: "from-teal-500 to-green-500",
      imagePosition: "left"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Analytics Assistant",
      description: "Ask questions in natural language and get instant answers. The AI chatbot analyzes your expense data and provides intelligent insights.",
      benefits: ["Natural language queries", "Instant data-driven responses", "Trend analysis and predictions", "Conversational interface", "No technical knowledge required"],
      color: "from-purple-500 to-pink-500",
      imagePosition: "right"
    },
    {
      icon: AlertCircle,
      title: "Smart Fraud & Anomaly Detection",
      description: "AI automatically flags suspicious expenses before approval. Detect duplicates, outliers, and policy violations.",
      benefits: ["Automatic duplicate detection", "Statistical outlier identification", "Policy compliance checking", "Risk scoring (High/Medium/Low)", "Detailed anomaly explanations"],
      color: "from-orange-500 to-red-500",
      imagePosition: "left"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <Navigation />
      <WaitlistPopup isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
      {!user && hasShownWaitlist && <FloatingWaitlistButton onClick={() => setIsWaitlistOpen(true)} />}

      <main>
        {/* Hero Section */}
        <section id="get-started" className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-36 md:pb-24 animate-fade-in">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6 animate-fade-in text-center lg:text-left" style={{ animationDelay: "200ms" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-semibold">Built for Indian Startups</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Smart Reimbursements.{" "}
                <span className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 bg-clip-text text-transparent">Simplified.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Snap your receipts, let AI handle the details, and streamline your reimbursement workflow with smart automation.
              </p>
              <div className="flex justify-center lg:justify-start pt-2 sm:pt-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 shadow-2xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 rounded-xl font-semibold">
                    Get Started with PAISABACK
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative order-first lg:order-last animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-teal-500/20 to-cyan-500/20 opacity-50 blur-3xl rounded-full animate-pulse"></div>
              <img src={heroImage} alt="PAISABACK automated expense management dashboard" loading="eager" className="relative rounded-xl sm:rounded-2xl shadow-2xl w-full hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </section>

        <ProductDemoVideo />

        {/* Built for Employees */}
        <section ref={employeeSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${employeeSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Built for Employees</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Get your money back fast — no paperwork hassle</p>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {demoSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeStep === index;
                    return (
                      <div key={index} className={`relative transition-all duration-500 ${isActive ? 'scale-105' : 'scale-95 opacity-60'}`}>
                        <div className={`bg-card border-2 rounded-2xl p-8 ${isActive ? 'border-primary/50 shadow-2xl shadow-primary/10' : 'border-border'} transition-all duration-500`}>
                          <div className="absolute top-4 right-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index + 1}</div>
                          </div>
                          <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-6">
                            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${isActive ? 'animate-pulse' : ''}`}></div>
                            <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                              <Icon className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="text-center space-y-3">
                            <h3 className="text-2xl font-bold">{step.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 overflow-hidden mt-6">
                            <div className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${isActive ? 'w-full' : 'w-0'}`}></div>
                          </div>
                        </div>
                        {index < demoSteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-12">
                {demoSteps.map((_, index) => (
                  <button key={index} onClick={() => setActiveStep(index)} className={`transition-all duration-300 rounded-full ${activeStep === index ? 'w-12 h-3 bg-primary' : 'w-3 h-3 bg-muted hover:bg-muted-foreground/30'}`} />
                ))}
              </div>
            </div>
            <div className="md:hidden space-y-4">
              {demoSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                return (
                  <div key={index} className={`bg-card border-2 rounded-2xl p-5 ${isActive ? 'border-primary/50 shadow-xl' : 'border-border opacity-70'} transition-all duration-500`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index + 1}</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden mt-4">
                      <div className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${isActive ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Built for Finance Teams */}
        <section ref={companySection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30 transition-all duration-1000 ${companySection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Built for Finance Teams & Admins</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Complete control and visibility over company expenses</p>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {companySteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeCompanyStep === index;
                    return (
                      <div key={index} className={`relative transition-all duration-500 ${isActive ? 'scale-105' : 'scale-95 opacity-60'}`}>
                        <div className={`bg-card border-2 rounded-2xl p-8 ${isActive ? 'border-primary/50 shadow-2xl shadow-primary/10' : 'border-border'} transition-all duration-500`}>
                          <div className="absolute top-4 right-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index + 1}</div>
                          </div>
                          <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-6">
                            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${isActive ? 'animate-pulse' : ''}`}></div>
                            <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                              <Icon className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="text-center space-y-3">
                            <h3 className="text-2xl font-bold">{step.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 overflow-hidden mt-6">
                            <div className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${isActive ? 'w-full' : 'w-0'}`}></div>
                          </div>
                        </div>
                        {index < companySteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-12">
                {companySteps.map((_, index) => (
                  <button key={index} onClick={() => setActiveCompanyStep(index)} className={`transition-all duration-300 rounded-full ${activeCompanyStep === index ? 'w-12 h-3 bg-primary' : 'w-3 h-3 bg-muted hover:bg-muted-foreground/30'}`} />
                ))}
              </div>
            </div>
            <div className="md:hidden space-y-4">
              {companySteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeCompanyStep === index;
                return (
                  <div key={index} className={`bg-card border-2 rounded-2xl p-5 ${isActive ? 'border-primary/50 shadow-xl' : 'border-border opacity-70'} transition-all duration-500`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index + 1}</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden mt-4">
                      <div className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${isActive ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Advanced Features */}
        <section ref={advancedFeaturesSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${advancedFeaturesSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 md:mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Advanced Intelligence</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
                Powered by <span className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 bg-clip-text text-transparent">AI & Machine Learning</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">Go beyond basic tracking with enterprise-grade analytics, conversational AI, and intelligent fraud detection</p>
            </div>
            <div className="space-y-24 sm:space-y-32">
              {advancedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const isReversed = feature.imagePosition === "right";
                return (
                  <div key={index} className="relative">
                    <div className="mb-8 sm:mb-12">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{feature.title}</h3>
                          <p className="text-base sm:text-lg text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`grid lg:grid-cols-5 gap-8 sm:gap-12 items-start ${isReversed ? 'lg:grid-flow-dense' : ''}`}>
                      <div className={`lg:col-span-2 space-y-4 ${isReversed ? 'lg:col-start-4' : ''}`}>
                        {feature.benefits.map((benefit, idx) => (
                          <div key={idx} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-300 group">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              </div>
                              <p className="text-sm font-medium text-foreground/80 leading-relaxed pt-1">{benefit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={`lg:col-span-3 ${isReversed ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                        {index === 0 && (
                          <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-3">
                              <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                              </div>
                              <span className="text-sm font-semibold">Expense Analytics Dashboard</span>
                            </div>
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">₹88K</div>
                                  <div className="text-xs text-muted-foreground mt-1">Total Spend</div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">156</div>
                                  <div className="text-xs text-muted-foreground mt-1">Transactions</div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">42</div>
                                  <div className="text-xs text-muted-foreground mt-1">Employees</div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Travel & Transport</span>
                                  <span className="text-sm font-bold">₹42,340</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-teal-500 to-green-500 rounded-full" style={{ width: '48%' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 1 && (
                          <div className="bg-card border-2 border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-3 border-b border-border flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-semibold">AI Analytics Assistant</span>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="flex justify-end">
                                <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-md max-w-xs">
                                  <p className="text-sm">Show me travel expenses for last month</p>
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md max-w-md border border-border">
                                  <p className="text-sm">Here's your travel expense summary:</p>
                                  <div className="mt-2 bg-background rounded-lg p-3 border border-border">
                                    <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">₹42,340</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 2 && (
                          <div className="bg-card border-2 border-orange-500/20 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                                  <Shield className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold">Fraud Detection System</span>
                              </div>
                              <div className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold">3 Alerts</div>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="border-2 border-red-500/50 bg-red-500/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-xs font-bold text-red-500">CRITICAL RISK</span>
                                  <span className="ml-auto px-2 py-1 rounded-md bg-red-500 text-white text-xs font-bold">HIGH</span>
                                </div>
                                <p className="text-sm font-bold">Duplicate Transaction Detected</p>
                                <p className="text-xs text-muted-foreground">Restaurant Bill • ₹2,450</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section ref={problemSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30 transition-all duration-1000 ${problemSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">The Reimbursement Challenge</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">In rapidly growing startups, employees frequently forget to file all their reimbursement expenses, leading to consistent out-of-pocket losses.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {problems.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <div key={index} className="bg-card border border-border rounded-2xl p-6 hover:border-red-500/30 transition-all duration-300 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{problem.title}</h3>
                    <p className="text-sm text-muted-foreground">{problem.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section id="features" ref={solutionSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${solutionSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Meet PAISABACK: Your Solution</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">PAISABACK automates the entire reimbursement workflow, giving startups transparency and employees peace of mind.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {solutions.map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <div key={index} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold mb-2">{solution.title}</h3>
                      <p className="text-sm text-muted-foreground">{solution.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" ref={pricingSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30 transition-all duration-1000 ${pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Simple Pricing for Growing Teams</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Choose the plan that fits your team size and needs</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-sm sm:max-w-none mx-auto">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`bg-card border rounded-2xl p-6 transition-all duration-300 relative ${plan.popular ? 'border-primary shadow-xl shadow-primary/10' : 'border-border'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold">Most Popular</span>
                    </div>
                  )}
                  <div className="space-y-4 text-center pt-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <Link to="/auth" className="block">
                      <Button className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80'}`} size="lg">Get Started</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section ref={testimonialSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${testimonialSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide">Trusted by teams and early users</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">What Our Users Say</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
                  <p className="text-foreground/80 italic mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-xs text-muted-foreground mb-4">Built at</p>
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border">
                <span className="text-lg font-bold">Mesa School of Business</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-5 h-5 text-primary" />
                <span className="text-sm">Bank-grade encryption</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm">Secure payments powered by Razorpay</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm">Trusted by professionals</span>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section ref={benefitsSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${benefitsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Who Benefits from PAISABACK?</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {benefits.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold mb-2">{item.role}</h3>
                      <p className="text-sm text-muted-foreground">{item.benefit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section ref={ctaSection.ref as React.RefObject<HTMLElement>} className={`container mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-16 lg:py-20 transition-all duration-1000 ${ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="shadow-2xl bg-gradient-to-r from-primary via-teal-600 to-cyan-600 rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="relative py-12 md:py-20 px-8 text-center">
              <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white">Get your PAISABACK — faster, smarter, and stress-free</h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90">Making reimbursements effortless, automated, and transparent for modern Indian startups.</p>
                <div className="pt-6">
                  <Link to="/auth">
                    <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-10 py-6 shadow-xl font-semibold">
                      Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="space-y-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-2 rounded-lg"><Receipt className="w-5 h-5 text-primary-foreground" /></div>
                <span className="text-lg font-bold">PAISABACK</span>
              </div>
              <p className="text-sm text-muted-foreground">Smart reimbursements for modern Indian startups</p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">Get Started</Link></li>
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary">Pricing</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">About Us</a></li>
                <li><a href="https://api.whatsapp.com/send/?phone=919664316377&text=Hi%2C+I+wanted+to+enquire+about+PAISABACK" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</a></li>
              </ul>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-9 h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center"><Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary" /></a>
                <a href="#" className="w-9 h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center"><Instagram className="w-4 h-4 text-muted-foreground hover:text-primary" /></a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2025 PAISABACK. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Made with ❤️ by the PAISABACK Team</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
