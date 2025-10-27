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

  // Waitlist popup triggers
  useEffect(() => {
    if (hasShownWaitlist || user) return;

    // Show after 15 seconds
    const timer = setTimeout(() => {
      setIsWaitlistOpen(true);
      setHasShownWaitlist(true);
    }, 15000);

    // Show at 70% scroll
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

      // Check org membership
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        // No org yet → if pending request exists, go to pending page; else auth
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

      // Has org → route by role
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
    {
      icon: FileX,
      title: "Lost Expenses",
      description: "Employees forget to claim small, recurring costs",
    },
    {
      icon: DollarSign,
      title: "Financial Burden",
      description: "Team members bear unnecessary personal losses",
    },
    {
      icon: AlertCircle,
      title: "Manual Chaos",
      description: "HR teams chase scattered claims and paperwork",
    },
  ];

  const solutions = [
    {
      icon: Camera,
      title: "Expense Tracking",
      description: "Employees capture and submit expenses instantly with photo upload and OCR",
    },
    {
      icon: CheckCircle2,
      title: "Smart Approval",
      description: "Org-level admins review, approve, or reject claims with a single click",
    },
    {
      icon: BarChart3,
      title: "Powerful Insights",
      description: "Company-wide dashboard with category-wise, employee-wise, and total spend analytics",
    },
  ];

  const pricingPlans = [
    {
      name: "Early Stage",
      price: "₹599",
      period: "/month",
      description: "Perfect for teams up to 20 employees",
      popular: false,
    },
    {
      name: "Growing Team",
      price: "₹1,099",
      period: "/month",
      description: "Ideal for teams up to 50 employees",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₹1,299",
      period: "/month",
      description: "Built for teams of 50+ employees",
      popular: false,
    },
  ];

  const benefits = [
    {
      icon: Users,
      role: "Employees",
      benefit: "Quick expense logging and faster reimbursements",
    },
    {
      icon: Banknote,
      role: "Finance Teams",
      benefit: "Streamlined approval workflows and audit trails",
    },
    {
      icon: Shield,
      role: "HR Leaders",
      benefit: "Complete visibility into company spending patterns",
    },
  ];

  const testimonials = [
    {
      quote: "PAISABACK transformed how our team handles reimbursements. No more lost receipts or delayed payments!",
      name: "Priya Sharma",
      role: "Operations Manager, Tech Startup",
    },
    {
      quote: "The AI automatically categorizes expenses and saves us hours every week. Game changer for our finance team.",
      name: "Rahul Mehta",
      role: "CFO, Growing SaaS Company",
    },
    {
      quote: "Finally, a reimbursement solution built for Indian startups. Simple, fast, and exactly what we needed.",
      name: "Anjali Desai",
      role: "HR Lead, Early-Stage Startup",
    },
  ];

  const advancedFeatures = [
    {
      icon: BarChart3,
      title: "Real-Time Analytics & Insights",
      description: "Visualize spending patterns with interactive charts. Track expenses by category, employee, department, and time periods.",
      benefits: [
        "Category-wise expense breakdown",
        "Employee spending trends",
        "Department-level analytics",
        "Custom date range filtering",
        "One-click report exports"
      ],
      color: "from-teal-500 to-green-500",
      imagePosition: "left"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Analytics Assistant",
      description: "Ask questions in natural language and get instant answers. The AI chatbot analyzes your expense data and provides intelligent insights.",
      benefits: [
        "Natural language queries",
        "Instant data-driven responses",
        "Trend analysis and predictions",
        "Conversational interface",
        "No technical knowledge required"
      ],
      color: "from-purple-500 to-pink-500",
      imagePosition: "right"
    },
    {
      icon: AlertCircle,
      title: "Smart Fraud & Anomaly Detection",
      description: "AI automatically flags suspicious expenses before approval. Detect duplicates, outliers, and policy violations.",
      benefits: [
        "Automatic duplicate detection",
        "Statistical outlier identification",
        "Policy compliance checking",
        "Risk scoring (High/Medium/Low)",
        "Detailed anomaly explanations"
      ],
      color: "from-orange-500 to-red-500",
      imagePosition: "left"
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <ScrollProgressBar />
      <Navigation />
      <WaitlistPopup isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
      {!user && hasShownWaitlist && (
        <FloatingWaitlistButton onClick={() => setIsWaitlistOpen(true)} />
      )}
      
      <main>
        {/* Hero Section */}
        <section id="get-started" className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-36 md:pb-24 animate-fade-in">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6 animate-fade-in text-center lg:text-left" style={{ animationDelay: "200ms" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-semibold">Built for Indian Startups</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Smart Reimbursements.{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Simplified.
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Upload your bills, let AI analyze them, and get your money back — instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 active:scale-95 sm:hover:scale-105 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 shadow-2xl hover:shadow-glow transition-all duration-300 rounded-xl font-semibold touch-manipulation"
                  >
                    Get Started with PAISABACK
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative order-first lg:order-last animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl rounded-full animate-pulse"></div>
              <img
                src={heroImage}
                alt="PAISABACK automated expense management dashboard"
                loading="eager"
                className="relative rounded-xl sm:rounded-2xl shadow-2xl w-full hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </section>

        {/* Product Demo Video */}
        <ProductDemoVideo />

        {/* Interactive Demo Section */}
        <section 
          ref={employeeSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${
            employeeSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                Built for Employees
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                Get your money back fast — no paperwork hassle
              </p>
            </div>

            {/* Desktop View - Horizontal Flow */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Connection Lines */}
                <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {demoSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeStep === index;
                    return (
                      <div
                        key={index}
                        className={`relative transition-all duration-500 ${
                          isActive ? 'scale-105' : 'scale-95 opacity-70'
                        }`}
                        style={{ transitionDelay: `${step.delay}ms` }}
                      >
                        <Card className={`bg-gradient-card border-2 ${
                          isActive ? 'border-primary shadow-2xl' : 'border-border/50 shadow-card'
                        } transition-all duration-500 hover:shadow-xl overflow-hidden`}>
                          <CardContent className="pt-8 pb-8 space-y-6 relative">
                            {/* Step Number */}
                            <div className="absolute top-4 right-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                            </div>

                            {/* Animated Icon */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${
                                isActive ? 'animate-pulse' : ''
                              }`}></div>
                              <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${
                                isActive ? 'animate-scale-in' : ''
                              }`}>
                                <Icon className="w-12 h-12 text-white" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-center space-y-3">
                              <h3 className="text-2xl font-bold">{step.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                                  isActive ? 'w-full' : 'w-0'
                                }`}
                              ></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Arrow Between Steps */}
                        {index < demoSteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${
                              isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-3 mt-12">
                {demoSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeStep === index 
                        ? 'w-12 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Mobile View - Vertical Stack */}
            <div className="md:hidden space-y-4 sm:space-y-6">
              {demoSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                return (
                  <Card 
                    key={index}
                    className={`bg-gradient-card border-2 ${
                      isActive ? 'border-primary shadow-2xl scale-100' : 'border-border/50 shadow-card scale-95'
                    } transition-all duration-500`}
                  >
                    <CardContent className="p-5 sm:pt-6 sm:pb-6 space-y-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold mb-1">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                            isActive ? 'w-full' : 'w-0'
                          }`}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="flex justify-center gap-2 pt-4">
                {demoSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`transition-all duration-300 rounded-full touch-manipulation ${
                      activeStep === index 
                        ? 'w-10 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Company Demo Section */}
        <section 
          ref={companySection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            companySection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                Built for Finance Teams & Admins
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                Complete control and visibility over company expenses
              </p>
            </div>

            {/* Desktop View - Horizontal Flow */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Connection Lines */}
                <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {companySteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeCompanyStep === index;
                    return (
                      <div
                        key={index}
                        className={`relative transition-all duration-500 ${
                          isActive ? 'scale-105' : 'scale-95 opacity-70'
                        }`}
                        style={{ transitionDelay: `${step.delay}ms` }}
                      >
                        <Card className={`bg-gradient-card border-2 ${
                          isActive ? 'border-primary shadow-2xl' : 'border-border/50 shadow-card'
                        } transition-all duration-500 hover:shadow-xl overflow-hidden`}>
                          <CardContent className="pt-8 pb-8 space-y-6 relative">
                            {/* Step Number */}
                            <div className="absolute top-4 right-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                            </div>

                            {/* Animated Icon */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${
                                isActive ? 'animate-pulse' : ''
                              }`}></div>
                              <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${
                                isActive ? 'animate-scale-in' : ''
                              }`}>
                                <Icon className="w-12 h-12 text-white" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-center space-y-3">
                              <h3 className="text-2xl font-bold">{step.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                                  isActive ? 'w-full' : 'w-0'
                                }`}
                              ></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Arrow Between Steps */}
                        {index < companySteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${
                              isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-3 mt-12">
                {companySteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveCompanyStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeCompanyStep === index 
                        ? 'w-12 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to company step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Mobile View - Vertical Stack */}
            <div className="md:hidden space-y-4 sm:space-y-6">
              {companySteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeCompanyStep === index;
                return (
                  <Card 
                    key={index}
                    className={`bg-gradient-card border-2 ${
                      isActive ? 'border-primary shadow-2xl scale-100' : 'border-border/50 shadow-card scale-95'
                    } transition-all duration-500`}
                  >
                    <CardContent className="p-5 sm:pt-6 sm:pb-6 space-y-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold mb-1">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                            isActive ? 'w-full' : 'w-0'
                          }`}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="flex justify-center gap-2 pt-4">
                {companySteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveCompanyStep(index)}
                    className={`transition-all duration-300 rounded-full touch-manipulation ${
                      activeCompanyStep === index 
                        ? 'w-10 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted'
                    }`}
                    aria-label={`Go to company step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Features Section */}
        <section 
          ref={advancedFeaturesSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${
            advancedFeaturesSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 md:mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Advanced Intelligence</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground px-4">
                Powered by{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  AI & Machine Learning
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
                Go beyond basic tracking with enterprise-grade analytics, conversational AI, and intelligent fraud detection
              </p>
            </div>

            <div className="space-y-24 sm:space-y-32">
              {advancedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const isReversed = feature.imagePosition === "right";
                
                return (
                  <div 
                    key={index}
                    className="relative"
                  >
                    {/* Feature Header */}
                    <div className="mb-8 sm:mb-12">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-base sm:text-lg text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`grid lg:grid-cols-5 gap-8 sm:gap-12 items-start ${
                      isReversed ? 'lg:grid-flow-dense' : ''
                    }`}>
                      {/* Benefits Cards */}
                      <div className={`lg:col-span-2 space-y-4 ${isReversed ? 'lg:col-start-4' : ''}`}>
                        {feature.benefits.map((benefit, idx) => (
                          <Card 
                            key={idx}
                            className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              </div>
                              <p className="text-sm font-medium text-foreground leading-relaxed pt-1">
                                {benefit}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Interactive Demo */}
                      <div className={`lg:col-span-3 ${isReversed ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                        {/* Analytics Dashboard Mockup */}
                        {index === 0 && (
                          <Card className="bg-gradient-card border-2 border-primary/20 shadow-2xl overflow-hidden">
                            <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-sm font-semibold">Expense Analytics Dashboard</span>
                              </div>
                              <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <CardContent className="p-6 space-y-6">
                              {/* Stats Grid */}
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-background/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">₹88K</div>
                                  <div className="text-xs text-muted-foreground mt-1">Total Spend</div>
                                  <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-500 font-semibold">12%</span>
                                  </div>
                                </div>
                                <div className="bg-background/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">156</div>
                                  <div className="text-xs text-muted-foreground mt-1">Transactions</div>
                                  <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-500 font-semibold">8%</span>
                                  </div>
                                </div>
                                <div className="bg-background/50 rounded-lg p-4 border border-border">
                                  <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-green-500 bg-clip-text text-transparent">42</div>
                                  <div className="text-xs text-muted-foreground mt-1">Employees</div>
                                  <div className="flex items-center gap-1 mt-2">
                                    <span className="text-xs text-muted-foreground font-semibold">Active</span>
                                  </div>
                                </div>
                              </div>

                              {/* Category Breakdown */}
                              <div>
                                <h4 className="text-sm font-semibold mb-4 flex items-center justify-between">
                                  <span>Spending by Category</span>
                                  <span className="text-xs text-muted-foreground font-normal">Last 30 days</span>
                                </h4>
                                <div className="space-y-3">
                                  <div className="group">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                        <span className="text-sm font-medium">Travel & Transport</span>
                                      </div>
                                      <span className="text-sm font-bold">₹42,340</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-teal-500 to-green-500 rounded-full transition-all duration-1000 group-hover:scale-x-105" style={{ width: '48%' }}></div>
                                    </div>
                                  </div>
                                  <div className="group">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-sm font-medium">Meals & Entertainment</span>
                                      </div>
                                      <span className="text-sm font-bold">₹28,900</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 group-hover:scale-x-105" style={{ width: '33%' }}></div>
                                    </div>
                                  </div>
                                  <div className="group">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-sm font-medium">Office Supplies</span>
                                      </div>
                                      <span className="text-sm font-bold">₹16,760</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 group-hover:scale-x-105" style={{ width: '19%' }}></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="sm" className="flex-1 text-xs">
                                  <PieChart className="w-3 h-3 mr-1" />
                                  View Report
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Time Range
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* AI Chatbot Mockup */}
                        {index === 1 && (
                          <Card className="bg-gradient-card border-2 border-primary/20 shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-3 border-b border-border flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold">AI Analytics Assistant</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    Online
                                  </div>
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-0">
                              {/* Chat Messages */}
                              <div className="p-6 space-y-4 min-h-[320px] max-h-[400px] overflow-y-auto">
                                <div className="flex justify-end animate-fade-in" style={{ animationDelay: '0ms' }}>
                                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-md max-w-xs shadow-md">
                                    <p className="text-sm">Show me travel expenses for last month</p>
                                    <span className="text-xs opacity-70 mt-1 block">10:24 AM</span>
                                  </div>
                                </div>
                                
                                <div className="flex justify-start animate-fade-in" style={{ animationDelay: '200ms' }}>
                                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md max-w-md shadow-md">
                                    <p className="text-sm mb-3">Here's your travel expense summary for last month:</p>
                                    <Card className="bg-background border-border">
                                      <CardContent className="p-3 space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground">Total Amount</span>
                                          <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">₹42,340</span>
                                        </div>
                                        <div className="h-px bg-border"></div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <div className="text-muted-foreground">Transactions</div>
                                            <div className="font-semibold">23</div>
                                          </div>
                                          <div>
                                            <div className="text-muted-foreground">Top Vendor</div>
                                            <div className="font-semibold">Uber</div>
                                          </div>
                                          <div>
                                            <div className="text-muted-foreground">Avg/Trip</div>
                                            <div className="font-semibold">₹1,841</div>
                                          </div>
                                          <div>
                                            <div className="text-muted-foreground">Employees</div>
                                            <div className="font-semibold">12</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <span className="text-xs text-muted-foreground mt-2 block">10:24 AM</span>
                                  </div>
                                </div>

                                <div className="flex justify-end animate-fade-in" style={{ animationDelay: '400ms' }}>
                                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-md max-w-xs shadow-md">
                                    <p className="text-sm">Who spent the most?</p>
                                    <span className="text-xs opacity-70 mt-1 block">10:25 AM</span>
                                  </div>
                                </div>

                                <div className="flex justify-start animate-fade-in" style={{ animationDelay: '600ms' }}>
                                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md max-w-md shadow-md">
                                    <p className="text-sm mb-2">Top 3 employees by travel spend:</p>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">1</div>
                                        <span className="font-medium flex-1">Sarah J.</span>
                                        <span className="font-bold">₹12,450</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center font-bold">2</div>
                                        <span className="font-medium flex-1">Mike R.</span>
                                        <span className="font-bold">₹9,800</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center font-bold">3</div>
                                        <span className="font-medium flex-1">Priya S.</span>
                                        <span className="font-bold">₹7,340</span>
                                      </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-2 block">10:25 AM</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Input Area */}
                              <div className="p-4 bg-muted/30 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-11 rounded-lg bg-background border border-border flex items-center px-4">
                                    <span className="text-sm text-muted-foreground">Ask me anything about expenses...</span>
                                  </div>
                                  <Button size="icon" className="h-11 w-11 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 hover:opacity-90">
                                    <ArrowRight className="w-5 h-5" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                  Powered by AI • Instant insights from your data
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Anomaly Detection Mockup */}
                        {index === 2 && (
                          <Card className="bg-gradient-card border-2 border-primary/20 shadow-2xl overflow-hidden">
                            <div className="bg-destructive/10 px-4 py-3 border-b border-destructive/20 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center">
                                  <Shield className="w-4 h-4 text-destructive-foreground" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold">Fraud Detection System</div>
                                  <div className="text-xs text-muted-foreground">Real-time monitoring active</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">3 Alerts</span>
                              </div>
                            </div>
                            <CardContent className="p-6 space-y-4">
                              {/* High Risk Alert */}
                              <Card className="border-2 border-red-500 bg-red-500/5 shadow-lg overflow-hidden animate-fade-in">
                                <div className="bg-red-500/20 px-4 py-2 border-b border-red-500/30 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-xs font-bold text-red-600">CRITICAL RISK</span>
                                  </div>
                                  <span className="px-2 py-1 rounded-md bg-red-600 text-white text-xs font-bold">HIGH</span>
                                </div>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                      <Receipt className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-bold text-sm mb-1">Duplicate Transaction Detected</div>
                                      <div className="text-xs text-muted-foreground mb-2">Restaurant Bill • ₹2,450 • 2 hours ago</div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <Users className="w-3 h-3" />
                                        <span>John Doe (Marketing)</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-background/50 rounded-lg p-3 space-y-2 border border-red-500/20">
                                    <div className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs">Same vendor: "The Pizza Place"</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs">Identical amount: ₹2,450</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs">Same date: Nov 15, 2024</span>
                                    </div>
                                    <div className="pt-2 border-t border-border mt-2">
                                      <span className="text-xs font-semibold text-red-600">
                                        ⚠️ Matches expense #1234 submitted yesterday
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    <Button size="sm" variant="destructive" className="flex-1 text-xs">
                                      Flag & Reject
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                                      Review Details
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Medium Risk Alert */}
                              <Card className="border-2 border-orange-500 bg-orange-500/5 shadow-md overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
                                <div className="bg-orange-500/20 px-4 py-2 border-b border-orange-500/30 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-orange-600" />
                                    <span className="text-xs font-bold text-orange-600">UNUSUAL PATTERN</span>
                                  </div>
                                  <span className="px-2 py-1 rounded-md bg-orange-600 text-white text-xs font-bold">MEDIUM</span>
                                </div>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                      <BarChart3 className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-bold text-sm mb-1">Statistical Outlier</div>
                                      <div className="text-xs text-muted-foreground mb-2">Office Supplies • ₹8,900 • 5 hours ago</div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <Users className="w-3 h-3" />
                                        <span>Sarah Miller (Operations)</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-background/50 rounded-lg p-3 border border-orange-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-muted-foreground">Amount vs Average</span>
                                      <span className="text-xs font-bold text-orange-600">+245%</span>
                                    </div>
                                    <div className="flex gap-2 items-end h-12">
                                      <div className="flex-1 bg-muted rounded-t h-4 flex items-center justify-center">
                                        <span className="text-xs font-semibold">₹2.8K</span>
                                      </div>
                                      <div className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t h-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">₹8.9K</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                      <span>Avg</span>
                                      <span>Current</span>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                                    Request Explanation
                                  </Button>
                                </CardContent>
                              </Card>

                              {/* Low Risk Alert */}
                              <Card className="border-2 border-yellow-500 bg-yellow-500/5 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: '400ms' }}>
                                <div className="bg-yellow-500/20 px-4 py-2 border-b border-yellow-500/30 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileX className="w-4 h-4 text-yellow-600" />
                                    <span className="text-xs font-bold text-yellow-600">POLICY ISSUE</span>
                                  </div>
                                  <span className="px-2 py-1 rounded-md bg-yellow-600 text-white text-xs font-bold">LOW</span>
                                </div>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                      <Camera className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-bold text-sm mb-1">Missing Receipt</div>
                                      <div className="text-xs text-muted-foreground mb-2">Taxi Fare • ₹1,200 • 1 day ago</div>
                                      <div className="text-xs bg-background/50 rounded-lg p-2 border border-yellow-500/20">
                                        Policy requires receipt for expenses over ₹1,000
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </CardContent>
                          </Card>
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
        <section 
          ref={problemSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            problemSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                The Reimbursement Challenge
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed px-4">
                In rapidly growing startups, employees frequently forget to file all their reimbursement expenses, 
                leading to consistent out-of-pocket losses. Meanwhile, HR and finance teams struggle with scattered, 
                manual expense claims that drain time and resources.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {problems.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group text-center"
                  >
                    <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8 space-y-3 sm:space-y-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto shadow-md">
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-2">{problem.title}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{problem.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section 
          id="features"
          ref={solutionSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${
            solutionSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                Meet PAISABACK: Your Solution
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
                PAISABACK automates the entire reimbursement workflow, giving startups transparency and employees peace of mind.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {solutions.map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <CardHeader className="space-y-3 sm:space-y-4 p-5 sm:p-6">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-all mx-auto">
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
                      </div>
                      <div className="text-center">
                        <CardTitle className="text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3">{solution.title}</CardTitle>
                        <CardDescription className="text-sm sm:text-base leading-relaxed">
                          {solution.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section 
          id="pricing"
          ref={pricingSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                Simple Pricing for Growing Teams
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                Choose the plan that fits your team size and needs
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-sm sm:max-w-none mx-auto">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative ${
                    plan.popular ? 'ring-2 ring-primary shadow-xl' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-primary text-primary-foreground px-3 py-1 sm:px-4 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="space-y-4 sm:space-y-6 text-center pt-6 sm:pt-8 p-5 sm:p-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-base sm:text-lg">{plan.period}</span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{plan.description}</p>
                    <Link to="/auth" className="w-full">
                      <Button 
                        className={`w-full touch-manipulation ${
                          plan.popular 
                            ? 'bg-gradient-primary hover:opacity-90 active:scale-95 text-primary-foreground' 
                            : 'bg-secondary hover:bg-secondary/80 active:scale-95'
                        }`}
                        size="lg"
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section 
          ref={testimonialSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            testimonialSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide">
                Trusted by teams and early users
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                What Our Users Say
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  quote={testimonial.quote}
                  name={testimonial.name}
                  role={testimonial.role}
                  delay={index * 100}
                />
              ))}
            </div>

            {/* Partner/Accelerator Badge */}
            <div className="mt-10 sm:mt-12 md:mt-16 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Built at</p>
              <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-base sm:text-lg font-bold text-foreground">Mesa School of Business</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-12">
              <TrustBadge icon={Lock} text="Bank-grade encryption" />
              <TrustBadge icon={Shield} text="Secure payments powered by Razorpay" />
              <TrustBadge icon={CheckCircle2} text="Trusted by professionals" />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section 
          ref={benefitsSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 transition-all duration-1000 ${
            benefitsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground px-4">
                Who Benefits from PAISABACK?
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {benefits.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <CardHeader className="space-y-3 sm:space-y-4 text-center p-5 sm:p-6">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-all mx-auto">
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3">{item.role}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {item.benefit}
                        </p>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section 
          ref={ctaSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-16 lg:py-20 transition-all duration-1000 ${
            ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Card className="shadow-xl bg-gradient-hero text-primary-foreground overflow-hidden relative border-0">
            <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-accent/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-56 h-56 sm:w-80 sm:h-80 bg-primary-glow/20 rounded-full blur-3xl"></div>
            <CardContent className="relative py-10 sm:py-12 md:py-16 lg:py-20 px-5 sm:px-8 text-center">
              <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                  Get your PAISABACK — faster, smarter, and stress-free
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 leading-relaxed px-2">
                  Making reimbursements effortless, automated, and transparent for modern Indian startups.
                </p>
                <div className="pt-4 sm:pt-6">
                  <Link to="/auth" className="inline-block w-full sm:w-auto">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto bg-card text-foreground hover:bg-card/90 active:scale-95 text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 shadow-xl hover:shadow-2xl transition-all touch-manipulation"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
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
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Brand */}
            <div className="space-y-3 sm:space-y-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-primary p-1.5 sm:p-2 rounded-lg">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <span className="text-base sm:text-lg font-bold text-foreground">PAISABACK</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                Smart reimbursements for modern Indian startups
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-semibold text-sm sm:text-base text-foreground">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <Link to="/auth" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <a href="#features" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-semibold text-sm sm:text-base text-foreground">Company</h4>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="https://api.whatsapp.com/send/?phone=919664316377&text=Hi%2C+I+wanted+to+enquire+about+PAISABACK&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Social */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-semibold text-sm sm:text-base text-foreground">Connect</h4>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
              <div className="flex gap-3 sm:gap-4 pt-2">
                <a 
                  href="#" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors touch-manipulation"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="#" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors touch-manipulation"
                  aria-label="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground hover:text-primary" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              © 2025 PAISABACK. All rights reserved.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
              Made with ❤️ by the PAISABACK Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
