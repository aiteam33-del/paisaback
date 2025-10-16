import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OCRProgressIndicatorProps {
  stage: "idle" | "uploading" | "analyzing" | "extracting" | "complete" | "error";
  progress: number;
  error?: string;
}

export const OCRProgressIndicator = ({
  stage,
  progress,
  error,
}: OCRProgressIndicatorProps) => {
  const stages = [
    { key: "uploading", label: "Uploading file...", progress: 20 },
    { key: "analyzing", label: "Analyzing receipt...", progress: 60 },
    { key: "extracting", label: "Extracting data...", progress: 90 },
    { key: "complete", label: "Complete!", progress: 100 },
  ];

  if (stage === "idle") return null;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {error ? "OCR Failed" : stage === "complete" ? "OCR Complete" : "Processing Receipt"}
        </h4>
        {error ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : stage === "complete" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>

      {!error && <Progress value={progress} className="h-2" />}

      <div className="space-y-2">
        {stages.map((s) => {
          const isActive = s.key === stage;
          const isPast = s.progress < progress;
          const isCurrent = isActive && stage !== "complete";

          return (
            <div
              key={s.key}
              className={cn(
                "flex items-center space-x-2 text-xs transition-colors",
                isPast || s.key === "complete" ? "text-green-500" : "",
                isCurrent ? "text-primary font-medium" : "",
                !isPast && !isCurrent && !isActive ? "text-muted-foreground" : ""
              )}
            >
              {isPast || (stage === "complete" && s.key === "complete") ? (
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
              ) : (
                <div className="h-3 w-3 rounded-full border-2 flex-shrink-0" />
              )}
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
};