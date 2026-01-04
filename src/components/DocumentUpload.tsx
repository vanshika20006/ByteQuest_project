import { useState, useRef, useEffect } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface DocumentUploadProps {
  onTextExtracted: (text: string) => void;
  disabled?: boolean;
}

const DocumentUpload = ({ onTextExtracted, disabled }: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) {
      throw new Error("PDF library not loaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const JSZip = (await import("jszip")).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) {
      throw new Error("Invalid DOCX file");
    }

    // Parse XML and extract text
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, "text/xml");
    
    const textNodes = xmlDoc.getElementsByTagName("w:t");
    let text = "";
    
    for (let i = 0; i < textNodes.length; i++) {
      text += textNodes[i].textContent || "";
    }
    
    // Add paragraph breaks
    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    let formattedText = "";
    
    for (let i = 0; i < paragraphs.length; i++) {
      const pTextNodes = paragraphs[i].getElementsByTagName("w:t");
      let pText = "";
      for (let j = 0; j < pTextNodes.length; j++) {
        pText += pTextNodes[j].textContent || "";
      }
      if (pText.trim()) {
        formattedText += pText + "\n\n";
      }
    }

    return formattedText.trim() || text;
  };

  const processFile = async (file: File) => {
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDOCX = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   file.name.toLowerCase().endsWith(".docx");

    if (!isPDF && !isDOCX) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }

    if (isPDF && !pdfLoaded) {
      toast({
        title: "Loading PDF library",
        description: "Please wait a moment and try again",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      let extractedText = "";

      if (isPDF) {
        extractedText = await extractTextFromPDF(file);
      } else {
        extractedText = await extractTextFromDOCX(file);
      }

      if (!extractedText.trim()) {
        throw new Error("No text could be extracted from the document");
      }

      onTextExtracted(extractedText);
      toast({
        title: "Document processed",
        description: `Extracted ${extractedText.length.toLocaleString()} characters from ${file.name}`
      });
    } catch (error) {
      console.error("Document processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to extract text from document",
        variant: "destructive"
      });
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
          ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Processing document...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-primary font-medium">Click to upload</span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </div>
            <span className="text-xs text-muted-foreground">PDF or DOCX (max 10MB)</span>
          </div>
        )}
      </div>

      {fileName && !isProcessing && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{fileName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
