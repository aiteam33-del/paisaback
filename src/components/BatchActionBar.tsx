import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BatchActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
  isProcessing?: boolean;
}

export const BatchActionBar = ({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onClear,
  isProcessing = false,
}: BatchActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right">
      <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>
        
        <div className="flex gap-2">
          <Button
            onClick={onApproveAll}
            disabled={isProcessing}
            size="sm"
            variant="default"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve All
          </Button>
          
          <Button
            onClick={onRejectAll}
            disabled={isProcessing}
            size="sm"
            variant="destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject All
          </Button>
        </div>
        
        <Button
          onClick={onClear}
          disabled={isProcessing}
          size="sm"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};