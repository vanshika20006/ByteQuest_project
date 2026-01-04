import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Claim {
  text: string;
  status: "verified" | "questionable" | "false";
  note: string;
}

interface HighlightedTextProps {
  originalText: string;
  claims: Claim[];
}

const HighlightedText = ({ originalText, claims }: HighlightedTextProps) => {
  const getHighlightClass = (status: Claim["status"]) => {
    switch (status) {
      case "verified":
        return "bg-success/20 border-b-2 border-success text-success cursor-help";
      case "questionable":
        return "bg-accent/20 border-b-2 border-accent text-accent cursor-help";
      case "false":
        return "bg-destructive/20 border-b-2 border-destructive text-destructive cursor-help";
    }
  };

  const getStatusIcon = (status: Claim["status"]) => {
    switch (status) {
      case "verified":
        return "✓";
      case "questionable":
        return "?";
      case "false":
        return "✗";
    }
  };

  let highlightedContent = originalText;
  const elements: JSX.Element[] = [];
  let lastIndex = 0;

  // Sort claims by their position in the text
  const sortedClaims = [...claims].sort((a, b) => {
    const indexA = originalText.toLowerCase().indexOf(a.text.toLowerCase());
    const indexB = originalText.toLowerCase().indexOf(b.text.toLowerCase());
    return indexA - indexB;
  });

  sortedClaims.forEach((claim, idx) => {
    const startIndex = originalText.toLowerCase().indexOf(claim.text.toLowerCase());
    if (startIndex === -1) return;

    // Add text before this claim
    if (startIndex > lastIndex) {
      elements.push(
        <span key={`text-${idx}`} className="text-foreground/90">
          {originalText.slice(lastIndex, startIndex)}
        </span>
      );
    }

    // Add highlighted claim
    elements.push(
      <Tooltip key={`claim-${idx}`}>
        <TooltipTrigger asChild>
          <span className={`${getHighlightClass(claim.status)} px-1 rounded transition-all hover:opacity-80`}>
            {originalText.slice(startIndex, startIndex + claim.text.length)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="glass-card max-w-xs">
          <div className="flex items-start gap-2">
            <span className={`text-lg ${
              claim.status === "verified" ? "text-success" :
              claim.status === "questionable" ? "text-accent" : "text-destructive"
            }`}>
              {getStatusIcon(claim.status)}
            </span>
            <div>
              <p className="font-medium capitalize">{claim.status}</p>
              <p className="text-sm text-muted-foreground">{claim.note}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );

    lastIndex = startIndex + claim.text.length;
  });

  // Add remaining text
  if (lastIndex < originalText.length) {
    elements.push(
      <span key="text-end" className="text-foreground/90">
        {originalText.slice(lastIndex)}
      </span>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 leading-relaxed text-base">
      {elements.length > 0 ? elements : <span className="text-foreground/90">{originalText}</span>}
    </div>
  );
};

export default HighlightedText;
