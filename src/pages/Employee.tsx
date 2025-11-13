import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Navigation } from "@/components/ui/navigation";
import { Upload, Receipt, Clock, CheckCircle2, XCircle, Loader2, X, Camera, ChevronRight, RefreshCw, BarChart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileDropzone } from "@/components/FileDropzone";
import { OCRProgressIndicator } from "@/components/OCRProgressIndicator";
import { SmartDatePicker } from "@/components/SmartDatePicker";
import { CategorySuggester } from "@/components/CategorySuggester";
import { PreviewThumbnail } from "@/components/PreviewThumbnail";
import { getReceiptPublicUrl } from "@/lib/attachments";

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

      // Check if session is about to expire (less than 5 minutes remaining)
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

  // Redirect admins to the org dashboard
  useEffect(() => {
    if (userRole === 'admin') {
      navigate('/admin');
    }
  }, [userRole, navigate]);

  // Periodic session health check (every 5 minutes)
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const tenMinutes = 10 * 60 * 1000;

      // Proactively refresh if less than 10 minutes remaining
      if (timeUntilExpiry < tenMinutes && timeUntilExpiry > 0) {
        console.log("Proactively refreshing session in background");
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          console.log("Background session refresh successful");
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkInterval);
  }, [user]);

  // Track user activity
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

      // Fetch organization name
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

    // Process OCR: prefer first image, else first PDF
    const firstImageFile = validFiles.find(f => f.type.startsWith('image/'));
    const firstPdfFile = validFiles.find(f => f.type === 'application/pdf');
    const targetFile = firstImageFile || firstPdfFile;
    if (targetFile && user) {
      await processOCR(targetFile);
    }
  };

const convertPdfFirstPageToPng = async (file: File) => {
  const pdfjsLib = await import('pdfjs-dist');
  // Use CDN worker matching the installed API version to avoid version mismatch errors
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore - pdfjs types can be finicky across versions
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
      // Ensure valid session before processing
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

      // Client-side OCR for verification (raw text)
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

      // Upload temporary file (image for AI extraction)
      setOcrStage("extracting");
      setOcrProgress(60);
      
      const fileExt = fileForAI.name.split('.').pop();
      const tempFileName = `${user?.id}/temp-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(tempFileName, fileForAI, { contentType: fileForAI.type || 'image/png' });

      if (uploadError) throw uploadError;

      setOcrProgress(80);
      
      // Call OCR function with bucket and path instead of public URL
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-receipt-ocr', {
        body: { bucket: 'receipts', path: tempFileName }
      });

      if (ocrError) throw ocrError;

      setOcrProgress(90);
      
      // Populate form fields with extracted data
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
      
      // Clean up temporary file
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

    // Ensure valid session before upload
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
          // Check for auth-specific errors
          const isAuthError = uploadError.message?.toLowerCase().includes('jwt') || 
                             uploadError.message?.toLowerCase().includes('token') ||
                             uploadError.message?.toLowerCase().includes('expired') ||
                             uploadError.message?.toLowerCase().includes('unauthorized');

          if (isAuthError && retryCount === 0) {
            console.log("Auth error during upload, refreshing session and retrying...");
            toast.info("Refreshing session, retrying upload...");
            
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError) {
              // Retry the upload once
              return await uploadFiles(1);
            }
          }

          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Store only the file path; we will resolve to a public URL when viewing
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
      // Ensure valid session before submission
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        setIsLoading(false);
        return;
      }

      // Upload files first
      const attachmentUrls = await uploadFiles();

      // Check for AI-generated images (only for first image)
      let aiDetectionResult = null;
      let isAiGenerated = false;

      if (attachmentUrls.length > 0) {
        const firstImagePath = attachmentUrls[0];
        const publicUrl = getReceiptPublicUrl(firstImagePath);
        
        try {
          const { data: detectionData, error: detectionError } = await supabase.functions.invoke('detect-ai-image', {
            body: { imageUrl: publicUrl }
          });

          if (!detectionError && detectionData) {
            aiDetectionResult = detectionData.detectionResult;
            isAiGenerated = detectionData.isAiGenerated || false;
          }
        } catch (detectError) {
          console.error('AI detection error (non-blocking):', detectError);
          // Continue with expense submission even if detection fails
        }
      }

      // Create expense record
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
      
      // Reset form
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

      // Refresh expenses
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit expense");
    } finally {
      setIsLoading(false);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle2 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  const statusColors = {
    pending: "bg-warning/20 text-warning border-warning/30",
    approved: "bg-success/20 text-success border-success/30",
    rejected: "bg-destructive/20 text-destructive border-destructive/30",
  };

  // Calculate total reimbursements (all time)
  const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending');
  
  const approvedAmount = approvedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const pendingAmount = pendingExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalAmount = approvedAmount + pendingAmount;
  const disabledByPending = !orgId || joinPending;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {userName ? `Welcome, ${userName}` : "Employee Dashboard"}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {orgName ? (
                  <Badge variant="outline">Organization: {orgName}</Badge>
                ) : joinPending ? (
                  <Badge variant="outline">Join request pending: {pendingOrgName || 'Your organization'}</Badge>
                ) : (
                  <Badge variant="outline">Not part of an organization</Badge>
                )}
                <p className="text-muted-foreground">Submit and track your expense claims</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/employee/history")}
              >
                <Receipt className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/employee/analytics")}
              >
                <BarChart className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-full">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Submit New Expense
              </CardTitle>
              <CardDescription>Upload receipt and fill in the details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload Section */}
                <div className="space-y-3">
                  <Label>Upload Receipts / Screenshots</Label>
                  <div className="border-2 border-dashed border-[hsl(var(--neon-green))] rounded-lg p-4 sm:p-6 text-center hover:border-primary/50 transition-all shadow-[var(--neon-glow)]">
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                          Upload images or PDF files
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose Files
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Take Photo
                          </Button>
                        </div>
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

                  {/* Preview uploaded files with thumbnails */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected files:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative border rounded-lg overflow-hidden group hover:border-primary transition-colors shadow-sm">
                            <AspectRatio ratio={1} className="bg-muted">
                              <PreviewThumbnail file={file} />
                            </AspectRatio>
                            <div className="p-2 bg-card/50 backdrop-blur-sm flex items-center justify-between gap-2 border-t">
                              <span className="text-xs truncate flex-1" title={file.name}>
                                {file.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-muted-foreground text-center">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {/* OCR Progress Indicator */}
                  {ocrStage !== "idle" && (
                    <OCRProgressIndicator 
                      stage={ocrStage}
                      progress={ocrProgress}
                      error={ocrError}
                    />
                  )}

                  {/* Retry OCR button on error */}
                  {ocrStage === "error" && uploadedFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const firstImage = uploadedFiles.find(f => f.type.startsWith('image/'));
                        const firstPdf = uploadedFiles.find(f => f.type === 'application/pdf');
                        const targetFile = firstImage || firstPdf;
                        if (targetFile) processOCR(targetFile);
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry OCR
                    </Button>
                  )}

                  {extractedFields && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Merchant:</span> <span className="font-medium text-foreground">{extractedFields.merchant || '-'}</span></div>
                      <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium text-foreground">{extractedFields.amount ?? '-'}</span></div>
                      <div><span className="text-muted-foreground">Date:</span> <span className="font-medium text-foreground">{extractedFields.date || '-'}</span></div>
                      <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{extractedFields.category || '-'}</span></div>
                    </div>
                  )}

                  </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isLoading}
                    readOnly={!!extractedFields}
                    className={extractedFields ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor Name</Label>
                  <Input 
                    id="vendor" 
                    placeholder="e.g., Uber, Hotel Taj"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    disabled={isLoading}
                    readOnly={!!extractedFields}
                    className={extractedFields ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      readOnly={!!extractedFields}
                      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${extractedFields ? "bg-muted/50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                      <SelectTrigger id="category">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment">Mode of Payment</Label>
                  <Select value={modeOfPayment} onValueChange={setModeOfPayment} disabled={isLoading}>
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Select payment method" />
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Add notes about this expense..." 
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                      Submitting...
                    </>
                  ) : (
                    "Submit for Approval"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Expenses</CardTitle>
                    <CardDescription>Your latest submission</CardDescription>
                  </div>
                  {expenses.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/employee/history")}
                      className="text-primary hover:text-primary/80"
                    >
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No expenses yet. Submit your first expense above!
                  </p>
                ) : (
                  expenses.slice(0, 1).map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-shadow gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{expense.vendor}</p>
                          <Badge variant="outline" className={statusColors[expense.status as keyof typeof statusColors]}>
                            {statusIcons[expense.status as keyof typeof statusIcons]}
                            <span className="ml-1 capitalize">{expense.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {expense.category} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                        )}
                        {expense.manager_notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-md border border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">Manager Notes:</p>
                            <p className="text-xs text-muted-foreground">{expense.manager_notes}</p>
                          </div>
                        )}
                        {expense.attachments && expense.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {expense.attachments.map((url, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const finalUrl = getReceiptPublicUrl(url);
                                  window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <Receipt className="w-3 h-3 mr-1.5" />
                                View Document{expense.attachments!.length > 1 ? ` ${idx + 1}` : ''}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:ml-4">
                        <p className="text-lg font-semibold text-foreground">₹{expense.amount}</p>
                        {canDeleteExpense(expense.created_at) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id, expense.created_at)}
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card bg-gradient-primary text-primary-foreground">
              <CardHeader>
                <CardTitle>Total Reimbursements</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  All reimbursements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl sm:text-4xl font-bold mb-3">₹{totalAmount.toLocaleString('en-IN')}</p>
                <div className="space-y-1 text-sm text-primary-foreground/90">
                  <div className="flex justify-between">
                    <span>Approved:</span>
                    <span className="font-semibold">₹{approvedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-semibold">₹{pendingAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-primary-foreground/20">
                    <span>Total:</span>
                    <span className="font-bold">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Employee;
