import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import TrustScoreMeter from "./TrustScoreMeter";

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

interface HistoryItem {
  id: string;
  text_preview: string;
  full_text: string;
  trust_score: number;
  claims: Claim[];
  citations: Citation[];
  created_at: string;
}

interface VerificationHistoryProps {
  onLoadVerification: (item: {
    text: string;
    trustScore: number;
    claims: Claim[];
    citations: Citation[];
  }) => void;
  refreshTrigger?: number;
}

const VerificationHistory = ({ onLoadVerification, refreshTrigger }: VerificationHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Parse JSONB fields with proper type casting
      const parsedData = (data || []).map(item => ({
        ...item,
        claims: Array.isArray(item.claims) ? (item.claims as unknown as Claim[]) : [],
        citations: Array.isArray(item.citations) ? (item.citations as unknown as Citation[]) : []
      }));

      setHistory(parsedData);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchHistory();
    }
  }, [isExpanded, refreshTrigger]);

  const handleLoad = (item: HistoryItem) => {
    onLoadVerification({
      text: item.full_text,
      trustScore: item.trust_score,
      claims: item.claims,
      citations: item.citations
    });
    toast({
      title: "Loaded from history",
      description: "Previous verification result restored",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-accent";
    return "text-destructive";
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <span className="font-display font-semibold">Verification History</span>
          {history.length > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {history.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No verification history yet</p>
              <p className="text-sm mt-1">Your verifications will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                  onClick={() => handleLoad(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90 line-clamp-2 mb-2">
                        {item.text_preview}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.created_at)}
                        </span>
                        <span>
                          {item.claims.length} claims
                        </span>
                        <span>
                          {item.citations.length} citations
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-2xl font-bold font-display ${getScoreColor(item.trust_score)}`}>
                        {item.trust_score}
                      </span>
                      <span className="text-xs text-muted-foreground">score</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationHistory;
