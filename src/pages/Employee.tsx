import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import {
  Upload, Receipt, Clock, CheckCircle2, XCircle, Loader2, X, Camera,
  ChevronRight, RefreshCw, BarChart3, Trash2, Sparkles, TrendingUp,
  Wallet, ArrowUpRight, FileText, CalendarDays
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OCRProgressIndicator } from "@/components/OCRProgressIndicator";
import { PreviewThumbnail } from "@/components/PreviewThumbnail";
import { getReceiptPublicUrl } from "@/lib/attachments";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SkeletonDashboard } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  status: string;
  date: string;
  description?: string;
  attachments?: string[];
  manager_notes?: string;
  created_at: string;
}

const Employee = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrStage, setOcrStage] = useState<"idle" | "uploading" | "analyzing" | "extracting" | "complete" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string>("");
  const [extractedFields, setExtractedFields] = useState<{ amount?: number; date?: string; merchant?: string; transaction_id?: string; category?: string; payment_method?: string } | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [pendingOrgName, setPendingOrgName] = useState<string>("");
  const [joinPending, setJoinPending] = useState<boolean>(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Form fields
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Helper function to ensure valid session before operations
  const ensureValidSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please log in again.");
        navigate("/auth");
        return false;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry < fiveMinutes) {
        console.log("Session expiring soon, refreshing...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Failed to refresh session:", refreshError);
          toast.error("Session expired. Please log in again.");
          navigate("/auth");
          return false;
        }

        if (!refreshData.session) {
          toast.error("Failed to refresh session. Please log in again.");
          navigate("/auth");
          return false;
        }

        toast.success("Session refreshed automatically", { duration: 2000 });
      }

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      toast.error("Session error. Please log in again.");
      navigate("/auth");
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (userRole === 'admin') {
      navigate('/admin');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    const checkInterval = setInterval(async () => {
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const tenMinutes = 10 * 60 * 1000;

      if (timeUntilExpiry < tenMinutes && timeUntilExpiry > 0) {
        console.log("Proactively refreshing session in background");
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          console.log("Background session refresh successful");
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(checkInterval);
  }, [user]);

  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      if (data.full_name) setUserName(data.full_name);
      setOrgId(data.organization_id ?? null);

      if (data.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", data.organization_id)
          .maybeSingle();

        if (orgData) setOrgName(orgData.name);
      }

      if (!data.organization_id) {
        const { data: jr } = await supabase
          .from("join_requests")
          .select("id, org_id")
          .eq("employee_id", user.id)
          .eq("status", "pending")
          .maybeSingle();
        setJoinPending(!!jr);
        if (jr?.org_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", jr.org_id)
            .maybeSingle();
          if (orgData) setPendingOrgName(orgData.name);
        } else {
          setPendingOrgName("");
        }
      } else {
        setJoinPending(false);
        setPendingOrgName("");
      }
    }
  };

  const fetchExpenses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load expenses");
      return;
    }

    setExpenses(data || []);
  };

  const handleDeleteExpense = async (expenseId: string, createdAt: string) => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const expenseCreatedAt = new Date(createdAt);

    if (expenseCreatedAt < tenMinutesAgo) {
      toast.error("Cannot delete expense after 10 minutes");
      return;
    }

    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      toast.error("Failed to delete expense");
      return;
    }

    toast.success("Expense deleted successfully");
    fetchExpenses();
  };

  const canDeleteExpense = (createdAt: string) => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const expenseCreatedAt = new Date(createdAt);
    return expenseCreatedAt >= tenMinutesAgo;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValid) {
        toast.error(`${file.name} is not a valid image or PDF`);
      }
      return isValid;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);

    const firstImageFile = validFiles.find(f => f.type.startsWith('image/'));
    const firstPdfFile = validFiles.find(f => f.type === 'application/pdf');
    const targetFile = firstImageFile || firstPdfFile;
    if (targetFile && user) {
      await processOCR(targetFile);
    }
  };

  const convertPdfFirstPageToPng = async (file: File) => {
    const pdfjsLib = await import('pdfjs-dist');
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    // @ts-ignore
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png'));
    return new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
  };

  const processOCR = async (file: File) => {
    setExtractedFields(null);
    setOcrText("");
    setIsProcessingOCR(true);
    setOcrStage("uploading");
    setOcrProgress(20);
    setOcrError("");

    toast.info("Extracting information from receipt...");

    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        setOcrStage("error");
        setOcrError("Session expired. Please log in again.");
        setIsProcessingOCR(false);
        return;
      }

      let fileForAI = file;
      if (file.type === 'application/pdf') {
        console.log('processOCR: converting PDF first page to PNG for OCR');
        fileForAI = await convertPdfFirstPageToPng(file);
      }

      setOcrStage("analyzing");
      setOcrProgress(40);

      try {
        const imageUrl = URL.createObjectURL(fileForAI);
        const Tesseract = await import('tesseract.js');
        const result: any = await Tesseract.recognize(imageUrl, 'eng', { logger: (m: any) => console.log('tesseract:', m) });
        URL.revokeObjectURL(imageUrl);
        const text: string = result?.data?.text || '';
        setOcrText(text);
        console.log('OCR raw text length:', text.length);
      } catch (tErr) {
        console.warn('Tesseract OCR failed:', tErr);
      }

      setOcrStage("extracting");
      setOcrProgress(60);

      const fileExt = fileForAI.name.split('.').pop();
      const tempFileName = `${user?.id}/temp-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(tempFileName, fileForAI, { contentType: fileForAI.type || 'image/png' });

      if (uploadError) throw uploadError;

      setOcrProgress(80);

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-receipt-ocr', {
        body: { bucket: 'receipts', path: tempFileName }
      });

      if (ocrError) throw ocrError;

      setOcrProgress(90);

      if (ocrData.merchant) setVendor(ocrData.merchant);
      else if (ocrData.vendor) setVendor(ocrData.vendor);
      if (ocrData.amount) setAmount(ocrData.amount.toString());
      if (ocrData.date) setDate(ocrData.date);
      if (ocrData.category) setCategory(ocrData.category);
      if (ocrData.payment_method) setModeOfPayment(ocrData.payment_method);

      setExtractedFields({
        merchant: ocrData.merchant || ocrData.vendor,
        amount: ocrData.amount,
        date: ocrData.date,
        category: ocrData.category,
        transaction_id: ocrData.transaction_id,
        payment_method: ocrData.payment_method,
      });

      setOcrStage("complete");
      setOcrProgress(100);
      toast.success("Information extracted! Verify below.");

      await supabase.storage.from('receipts').remove([tempFileName]);
    } catch (error: any) {
      console.error("OCR Error:", error);
      setOcrStage("error");
      setOcrError(error.message || "Failed to extract information. Please fill manually.");
      toast.error(error.message || "Failed to extract information. Please fill manually.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (retryCount = 0): Promise<string[]> => {
    if (!user || uploadedFiles.length === 0) return [];

    const sessionValid = await ensureValidSession();
    if (!sessionValid) {
      return [];
    }

    const urls: string[] = [];
    setUploadProgress(0);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

      try {
        const { error: uploadError, data } = await supabase.storage
          .from('receipts')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) {
          const isAuthError = uploadError.message?.toLowerCase().includes('jwt') ||
                             uploadError.message?.toLowerCase().includes('token') ||
                             uploadError.message?.toLowerCase().includes('expired') ||
                             uploadError.message?.toLowerCase().includes('unauthorized');

          if (isAuthError && retryCount === 0) {
            console.log("Auth error during upload, refreshing session and retrying...");
            toast.info("Refreshing session, retrying upload...");

            const { error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError) {
              return await uploadFiles(1);
            }
          }

          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        urls.push(fileName);
        setUploadProgress(((i + 1) / uploadedFiles.length) * 100);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast.error(`Error uploading ${file.name}`);
        continue;
      }
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to submit expenses");
      return;
    }

    if (!vendor || !amount || !category || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        setIsLoading(false);
        return;
      }

      const attachmentUrls = await uploadFiles();

      let aiDetectionResult = null;
      let isAiGenerated = false;

      if (attachmentUrls.length > 0) {
        const firstImagePath = attachmentUrls[0];

        try {
          const publicUrl = getReceiptPublicUrl(firstImagePath);
          const { data: detectionData } = await supabase.functions.invoke('detect-ai-image', {
            body: { imageUrl: publicUrl }
          });

          if (detectionData) {
            aiDetectionResult = detectionData.detectionResult;
            isAiGenerated = detectionData.isAiGenerated || false;
          }
        } catch (detectError) {
          // Silent fail - don't block expense submission
        }
      }

      const { error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          vendor,
          amount: parseFloat(amount),
          category,
          description,
          mode_of_payment: modeOfPayment,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          attachments: attachmentUrls,
          status: 'pending',
          ai_detection_result: aiDetectionResult,
          is_ai_generated: isAiGenerated,
        });

      if (error) throw error;

      toast.success("Expense submitted successfully!");

      setVendor("");
      setAmount("");
      setCategory("");
      setDescription("");
      setModeOfPayment("");
      setDate(new Date().toISOString().split('T')[0]);
      setUploadedFiles([]);
      setUploadedUrls([]);
      setUploadProgress(0);
      setExtractedFields(null);

      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit expense");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-mesh">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
          <SkeletonDashboard />
        </main>
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  };

  const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending');

  const approvedAmount = approvedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const pendingAmount = pendingExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalAmount = approvedAmount + pendingAmount;

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <Navigation />
      <OnboardingTour tourType="employee" />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                AI-Powered Receipt Scanning
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                {userName ? (
                  <>Welcome back, <span className="text-gradient">{userName}</span></>
                ) : (
                  "Employee Dashboard"
                )}
              </h1>
              <p className="text-lg text-muted-foreground">
                Submit expenses with AI-powered receipt scanning
              </p>
              {orgName && (
                <Badge variant="outline" className="mt-3 text-sm">
                  {orgName}
                </Badge>
              )}
              {joinPending && (
                <Badge variant="outline" className="mt-3 text-sm text-amber-600 border-amber-500/30 bg-amber-500/10">
                  <Clock className="w-3 h-3 mr-1" />
                  Join request pending: {pendingOrgName}
                </Badge>
              )}
            </div>

          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-cyan-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-bold mb-1">₹{totalAmount.toLocaleString('en-IN')}</h3>
            <p className="text-sm text-muted-foreground">Total Claims</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                {approvedExpenses.length} approved
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">₹{approvedAmount.toLocaleString('en-IN')}</h3>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                {pendingExpenses.length} pending
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">₹{pendingAmount.toLocaleString('en-IN')}</h3>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Submit Form - 3 columns */}
          <div className="lg:col-span-3" data-tour="expense-form">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Submit New Expense</h2>
                    <p className="text-sm text-muted-foreground">Upload receipt for AI extraction</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* File Upload */}
                <div className="space-y-3" data-tour="receipt-upload">
                  <Label className="text-base font-medium">Receipt Upload</Label>
                  <div
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer",
                      "hover:border-primary hover:bg-primary/5",
                      uploadedFiles.length > 0 ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-2xl bg-muted">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Drop your receipt here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          disabled={isLoading}
                          className="rounded-xl"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Browse
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                          disabled={isLoading}
                          className="rounded-xl"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Camera
                        </Button>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* File Previews */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-border/50">
                          <AspectRatio ratio={1} className="bg-muted">
                            <PreviewThumbnail file={file} />
                          </AspectRatio>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {/* OCR Progress */}
                  {ocrStage !== "idle" && (
                    <OCRProgressIndicator
                      stage={ocrStage}
                      progress={ocrProgress}
                      error={ocrError}
                    />
                  )}

                  {/* Retry OCR */}
                  {ocrStage === "error" && uploadedFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const targetFile = uploadedFiles.find(f => f.type.startsWith('image/')) || uploadedFiles.find(f => f.type === 'application/pdf');
                        if (targetFile) processOCR(targetFile);
                      }}
                      className="w-full rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry OCR
                    </Button>
                  )}

                  {/* Extracted Fields Preview */}
                  {extractedFields && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Extracted Data
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Merchant:</span> <span className="font-medium">{extractedFields.merchant || '-'}</span></div>
                        <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">₹{extractedFields.amount ?? '-'}</span></div>
                        <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{extractedFields.date || '-'}</span></div>
                        <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{extractedFields.category || '-'}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="vendor">Vendor Name</Label>
                    <Input
                      id="vendor"
                      placeholder="e.g., Uber, Hotel Taj"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      disabled={isLoading}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isLoading}
                      className="rounded-xl h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isLoading}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                      <SelectTrigger id="category" className="rounded-xl h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="lodging">Lodging</SelectItem>
                        <SelectItem value="office">Office Supplies</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select value={modeOfPayment} onValueChange={setModeOfPayment} disabled={isLoading}>
                      <SelectTrigger id="payment" className="rounded-xl h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="net_banking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Digital Wallet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Add notes about this expense..."
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      className="rounded-xl resize-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  data-tour="submit-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-5 h-5 mr-2" />
                      Submit for Approval
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Recent Expenses - 2 columns */}
          <div className="lg:col-span-2" data-tour="recent-expenses">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden sticky top-24">
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Recent Expenses</h2>
                  <p className="text-sm text-muted-foreground">Your latest submissions</p>
                </div>
                {expenses.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/employee/history")}
                    className="gap-1 text-primary"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {expenses.length === 0 ? (
                  <EmptyState
                    type="expenses"
                    title="No expenses yet"
                    description="Upload a receipt above to submit your first expense"
                    className="py-8"
                  />
                ) : (
                  expenses.slice(0, 5).map((expense) => {
                    const config = statusConfig[expense.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={expense.id}
                        className="group p-4 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{expense.vendor}</p>
                            <p className="text-sm text-muted-foreground">
                              {expense.category} • {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{expense.amount.toLocaleString('en-IN')}</p>
                            <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {expense.status}
                            </div>
                          </div>
                        </div>

                        {expense.attachments && expense.attachments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 rounded-lg"
                            onClick={() => {
                              const finalUrl = getReceiptPublicUrl(expense.attachments![0]);
                              window.open(finalUrl, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <Receipt className="w-3 h-3 mr-2" />
                            View Receipt
                          </Button>
                        )}

                        {canDeleteExpense(expense.created_at) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id, expense.created_at)}
                            className="w-full justify-start text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg mt-1"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete (within 10 min)
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Employee;
