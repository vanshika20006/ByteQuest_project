import { Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface Claim {
  text: string;
  status: "verified" | "questionable" | "false";
  note: string;
}

interface Citation {
  source: string;
  url: string;
  status: "valid" | "broken" | "fake";
  reason: string;
}

interface ExportResultsProps {
  inputText: string;
  trustScore: number;
  claims: Claim[];
  citations: Citation[];
}

const ExportResults = ({ inputText, trustScore, claims, citations }: ExportResultsProps) => {
  const { toast } = useToast();

  const exportAsJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      trustScore,
      inputText,
      claims,
      citations,
      summary: {
        totalClaims: claims.length,
        verifiedClaims: claims.filter(c => c.status === "verified").length,
        questionableClaims: claims.filter(c => c.status === "questionable").length,
        falseClaims: claims.filter(c => c.status === "false").length,
        totalCitations: citations.length,
        validCitations: citations.filter(c => c.status === "valid").length,
        brokenCitations: citations.filter(c => c.status === "broken").length,
        fakeCitations: citations.filter(c => c.status === "fake").length,
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Results exported as JSON"
    });
  };

  const exportAsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Content Verification Report", margin, yPos);
    yPos += 12;

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 15;

    // Trust Score
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Trust Score: ${trustScore}%`, margin, yPos);
    yPos += 12;

    // Score bar
    const barWidth = 60;
    const barHeight = 6;
    doc.setFillColor(229, 231, 235);
    doc.rect(margin, yPos, barWidth, barHeight, "F");
    
    const scoreColor = trustScore >= 70 ? [34, 197, 94] : trustScore >= 40 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.rect(margin, yPos, (barWidth * trustScore) / 100, barHeight, "F");
    yPos += 20;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summary = [
      `Claims: ${claims.filter(c => c.status === "verified").length} verified, ${claims.filter(c => c.status === "questionable").length} questionable, ${claims.filter(c => c.status === "false").length} false`,
      `Citations: ${citations.filter(c => c.status === "valid").length} valid, ${citations.filter(c => c.status === "broken").length} broken, ${citations.filter(c => c.status === "fake").length} fake`
    ];
    summary.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 10;

    // Claims section
    if (claims.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Claims Analysis", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      claims.forEach((claim, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }

        const statusColors: Record<string, number[]> = {
          verified: [34, 197, 94],
          questionable: [234, 179, 8],
          false: [239, 68, 68]
        };
        
        const color = statusColors[claim.status];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`[${claim.status.toUpperCase()}]`, margin, yPos);
        
        doc.setTextColor(0, 0, 0);
        const claimText = doc.splitTextToSize(claim.text, contentWidth - 30);
        doc.text(claimText, margin + 25, yPos);
        yPos += claimText.length * 5;

        if (claim.note) {
          doc.setTextColor(100, 100, 100);
          const noteText = doc.splitTextToSize(`Note: ${claim.note}`, contentWidth - 30);
          doc.text(noteText, margin + 25, yPos);
          yPos += noteText.length * 5;
        }
        yPos += 5;
      });
      yPos += 5;
    }

    // Citations section
    if (citations.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Citations Check", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      citations.forEach((citation) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }

        const statusColors: Record<string, number[]> = {
          valid: [34, 197, 94],
          broken: [234, 179, 8],
          fake: [239, 68, 68]
        };
        
        const color = statusColors[citation.status];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`[${citation.status.toUpperCase()}]`, margin, yPos);
        
        doc.setTextColor(0, 0, 0);
        doc.text(citation.source, margin + 20, yPos);
        yPos += 5;

        if (citation.url && citation.url !== "unknown") {
          doc.setTextColor(59, 130, 246);
          const urlText = doc.splitTextToSize(citation.url, contentWidth - 25);
          doc.text(urlText, margin + 20, yPos);
          yPos += urlText.length * 4;
        }

        doc.setTextColor(100, 100, 100);
        const reasonText = doc.splitTextToSize(citation.reason, contentWidth - 25);
        doc.text(reasonText, margin + 20, yPos);
        yPos += reasonText.length * 4 + 5;
      });
    }

    // Original text (truncated)
    if (inputText) {
      if (yPos > 220) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Analyzed Text (Preview)", margin, yPos);
      yPos += 8;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      const previewText = inputText.length > 500 
        ? inputText.substring(0, 500) + "..." 
        : inputText;
      const textLines = doc.splitTextToSize(previewText, contentWidth);
      doc.text(textLines.slice(0, 15), margin, yPos);
    }

    doc.save(`verification-report-${Date.now()}.pdf`);

    toast({
      title: "Export successful",
      description: "Report exported as PDF"
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsJSON} className="gap-2 cursor-pointer">
          <FileJson className="w-4 h-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportResults;
