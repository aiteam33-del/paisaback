import { useCallback } from "react";
import { Upload, FileImage, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: FileList) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  accept?: string;
  maxFiles?: number;
}

export const FileDropzone = ({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  accept = "image/*,application/pdf",
  maxFiles = 5,
}: FileDropzoneProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const getFilePreview = (file: File) => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          "hover:border-primary/50 hover:bg-primary/5",
          "cursor-pointer"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={accept}
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          className="hidden"
        />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports images and PDFs (max {maxFiles} files)
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {selectedFiles.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div
                key={index}
                className="relative group border rounded-lg p-2 hover:border-primary transition-colors"
              >
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-3 w-3" />
                </button>
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};