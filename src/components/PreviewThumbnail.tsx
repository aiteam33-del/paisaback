import { useEffect, useState } from "react";
import { FileImage, Receipt } from "lucide-react";

interface PreviewThumbnailProps {
  file: File;
  alt?: string;
}

export const PreviewThumbnail = ({ file, alt }: PreviewThumbnailProps) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    let revoked = false;

    const loadImage = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (!revoked) setDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    };

    const loadPdfFirstPage = async () => {
      try {
        setIsPdf(true);
        const pdfjsLib: any = await import("pdfjs-dist");
        // Use worker from CDN to avoid bundler worker issues
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        // Target thumbnail size ~160px width
        const targetWidth = 160;
        const scale = targetWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        canvas.width = Math.max(1, Math.floor(scaledViewport.width));
        canvas.height = Math.max(1, Math.floor(scaledViewport.height));
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        const url = canvas.toDataURL("image/png");
        if (!revoked) setDataUrl(url);
      } catch (err) {
        console.warn("PDF thumbnail failed", err);
        if (!revoked) setDataUrl(null);
      }
    };

    if (file.type.startsWith("image/")) {
      loadImage();
    } else if (file.type === "application/pdf") {
      loadPdfFirstPage();
    } else {
      setDataUrl(null);
    }

    return () => {
      revoked = true;
    };
  }, [file]);

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={alt || file.name}
        className="w-full h-full object-cover"
        draggable={false}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground select-none">
      {isPdf ? (
        <>
          <Receipt className="w-10 h-10" />
          <span className="text-xs mt-1">PDF</span>
        </>
      ) : (
        <FileImage className="w-10 h-10" />
      )}
    </div>
  );
};