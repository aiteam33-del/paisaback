import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { Upload, Receipt, Clock, CheckCircle2, XCircle, Loader2, X, Camera, ChevronRight, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  status: string;
  date: string;
  description?: string;
  attachments?: string[];
}

const Employee = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [extractedFields, setExtractedFields] = useState<{ amount?: number; date?: string; merchant?: string; transaction_id?: string; category?: string } | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Form fields
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

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
    toast.info("Extracting information from receipt...");
    try {
      let fileForAI = file;
      if (file.type === 'application/pdf') {
        console.log('processOCR: converting PDF first page to PNG for OCR');
        fileForAI = await convertPdfFirstPageToPng(file);
      }

      // Client-side OCR for verification (raw text)
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
      const fileExt = fileForAI.name.split('.').pop();
      const tempFileName = `${user?.id}/temp-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(tempFileName, fileForAI, { contentType: fileForAI.type || 'image/png' });

      if (uploadError) throw uploadError;

      // Call OCR function with bucket and path instead of public URL
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-receipt-ocr', {
        body: { bucket: 'receipts', path: tempFileName }
      });

      if (ocrError) throw ocrError;

      // Populate form fields with extracted data
      if (ocrData.merchant) setVendor(ocrData.merchant);
      else if (ocrData.vendor) setVendor(ocrData.vendor);
      if (ocrData.amount) setAmount(ocrData.amount.toString());
      if (ocrData.date) setDate(ocrData.date);
      if (ocrData.category) setCategory(ocrData.category);
      setExtractedFields({
        merchant: ocrData.merchant || ocrData.vendor,
        amount: ocrData.amount,
        date: ocrData.date,
        category: ocrData.category,
        transaction_id: ocrData.transaction_id,
      });
      toast.success("Information extracted! Verify below.");
      
      // Clean up temporary file
      await supabase.storage.from('receipts').remove([tempFileName]);
    } catch (error: any) {
      console.error("OCR Error:", error);
      toast.error(error.message || "Failed to extract information. Please fill manually.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || uploadedFiles.length === 0) return [];

    const urls: string[] = [];
    setUploadProgress(0);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: signedData, error: signedErr } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      if (signedErr) {
        toast.error(`Failed to get secure URL for ${file.name}`);
        continue;
      }

      urls.push(signedData.signedUrl);
      setUploadProgress(((i + 1) / uploadedFiles.length) * 100);
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
      // Upload files first
      const attachmentUrls = await uploadFiles();

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
          status: 'pending'
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

  const handleSendEmail = async () => {
    try {
      setIsSendingEmail(true);
      
      if (!user) {
        toast.error("Please log in");
        return;
      }

      if (expenses.length === 0) {
        toast.error("No expenses to send. Please add at least one expense.");
        return;
      }

      // Get Google OAuth token
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send',
          redirectTo: `${window.location.origin}/employee`,
        },
      });

      if (oauthError) throw oauthError;

      // Wait for OAuth callback
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.provider_token) {
        throw new Error("Failed to get Google access token");
      }

      // Call edge function with access token
      const { data: result, error: functionError } = await supabase.functions.invoke(
        'send-gmail-expense',
        {
          body: {
            userId: user?.id,
            accessToken: session.provider_token,
          },
        }
      );

      if (functionError) throw functionError;

      toast.success("✅ Email sent successfully via Gmail!");
      console.log("Email result:", result);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadEmailDraft = async () => {
    if (!user) {
      toast.error("Please log in to download email draft");
      return;
    }

    // Fetch user profile to get superior email and full name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("superior_email, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      toast.error("Failed to load profile information");
      return;
    }

    if (!profile) {
      toast.error("No profile found. Please update your profile in the organization section.");
      return;
    }

    // TEMPORARY: For testing with Resend free tier, use account owner email
    const recipientEmail = "ai_team33@mesaschool.co";

    if (expenses.length === 0) {
      toast.error("No expenses to download. Please submit at least one expense.");
      return;
    }

    setIsSendingEmail(true);
    toast.info("Generating email draft...");

    try {
      const { data, error } = await supabase.functions.invoke('generate-email-eml', {
        body: {
          userId: user.id,
          recipientEmail,
          employeeName: profile.full_name || "Employee"
        }
      });

      if (error) throw error;

      // Create blob from the EML content
      const blob = new Blob([data], { type: 'message/rfc822' });
      const url = window.URL.createObjectURL(blob);
      
      // Try to open in a new window first (may trigger mail app on some systems)
      const newWindow = window.open(url, '_blank');
      
      // Fallback to download if popup blocked or doesn't open mail app
      setTimeout(() => {
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Popup was blocked, download the file instead
          const a = document.createElement('a');
          a.href = url;
          a.download = `expense_reimbursement_${Date.now()}.eml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("📧 Email draft downloaded! Double-click the .eml file to open in your mail app.");
        } else {
          toast.success("📧 Opening email in your mail app...");
        }
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
      console.error("Email draft generation error:", error);
      toast.error(error.message || "Failed to generate email draft. Please try again.");
    } finally {
      setIsSendingEmail(false);
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Employee Dashboard</h1>
          <p className="text-muted-foreground">Submit and track your expense claims</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
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
                  <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center hover:border-primary/50 transition-colors">
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
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Preview uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected files:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative border rounded-lg p-2 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
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

                  {isProcessingOCR && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting information from receipt...</span>
                    </div>
                  )}

                  {ocrText && (
                    <div className="mt-2">
                      <Label>Extracted Text (OCR)</Label>
                      <div className="mt-1 rounded-md border border-border bg-muted/30 p-2 max-h-40 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">
                        {ocrText.slice(0, 4000)}
                      </div>
                    </div>
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
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <Receipt className="w-3 h-3 mr-1.5" />
                                View Document{expense.attachments!.length > 1 ? ` ${idx + 1}` : ''}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-foreground sm:ml-4">₹{expense.amount}</p>
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

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Send Reimbursement Request
                </CardTitle>
                <CardDescription>Send your expenses via Gmail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || expenses.length === 0}
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                    size="lg"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        Send via Gmail
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDownloadEmailDraft}
                    disabled={isSendingEmail || expenses.length === 0}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Download Draft
                  </Button>
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
