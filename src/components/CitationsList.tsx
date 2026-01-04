import { ExternalLink, AlertTriangle, XCircle } from "lucide-react";

interface Citation {
  source: string;
  url: string;
  status: "valid" | "broken" | "fake";
  reason: string;
}

interface CitationsListProps {
  citations: Citation[];
}

const CitationsList = ({ citations }: CitationsListProps) => {
  const fakeCitations = citations.filter(c => c.status === "fake" || c.status === "broken");

  if (fakeCitations.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-success text-xl">✓</span>
        </div>
        <p className="text-success font-medium">All citations verified</p>
        <p className="text-sm text-muted-foreground mt-1">No fake or broken citations detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fakeCitations.map((citation, index) => (
        <div 
          key={index} 
          className={`glass-card rounded-xl p-4 border-l-4 animate-slide-in-right ${
            citation.status === "fake" ? "border-l-destructive" : "border-l-accent"
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              citation.status === "fake" ? "bg-destructive/20" : "bg-accent/20"
            }`}>
              {citation.status === "fake" ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  citation.status === "fake" 
                    ? "bg-destructive/20 text-destructive" 
                    : "bg-accent/20 text-accent"
                }`}>
                  {citation.status === "fake" ? "Fake Citation" : "Broken Link"}
                </span>
              </div>
              <p className="font-medium text-sm text-foreground truncate">
                {citation.source}
              </p>
              <a 
                href={citation.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                {citation.url}
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                {citation.reason}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CitationsList;
