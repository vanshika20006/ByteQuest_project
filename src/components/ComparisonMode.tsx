import { useState } from "react";
import { GitCompare, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TrustScoreMeter from "./TrustScoreMeter";

interface Claim {
  text: string;
  status: "verified" | "questionable" | "false";
  note: string;
  suggestedSources?: string[];
}

interface Citation {
  source: string;
  url: string;
  status: "valid" | "broken" | "fake";
  reason: string;
}

interface ComparisonResult {
  trustScore: number;
  claims: Claim[];
  citations: Citation[];
}

const ComparisonMode = () => {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [resultA, setResultA] = useState<ComparisonResult | null>(null);
  const [resultB, setResultB] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const { toast } = useToast();

  const handleCompare = async () => {
    if (!textA.trim() || !textB.trim()) {
      toast({
        title: "Both texts required",
        description: "Please enter text in both fields to compare",
        variant: "destructive"
      });
      return;
    }

    setIsComparing(true);
    setResultA(null);
    setResultB(null);

    try {
      const [responseA, responseB] = await Promise.all([
        supabase.functions.invoke("verify-content", { body: { text: textA } }),
        supabase.functions.invoke("verify-content", { body: { text: textB } })
      ]);

      if (responseA.error) throw new Error(responseA.error.message);
      if (responseB.error) throw new Error(responseB.error.message);

      setResultA({
        trustScore: responseA.data.trustScore || 50,
        claims: responseA.data.claims || [],
        citations: responseA.data.citations || []
      });

      setResultB({
        trustScore: responseB.data.trustScore || 50,
        claims: responseB.data.claims || [],
        citations: responseB.data.citations || []
      });

      toast({
        title: "Comparison complete",
        description: "Both texts have been analyzed"
      });
    } catch (error) {
      console.error("Comparison error:", error);
      toast({
        title: "Comparison failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsComparing(false);
    }
  };

  const getScoreDiff = () => {
    if (!resultA || !resultB) return null;
    const diff = resultB.trustScore - resultA.trustScore;
    if (diff === 0) return { text: "Same score", color: "text-muted-foreground" };
    if (diff > 0) return { text: `+${diff} points`, color: "text-success" };
    return { text: `${diff} points`, color: "text-destructive" };
  };

  const scoreDiff = getScoreDiff();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <GitCompare className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold">Comparison Mode</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Text A (Original)</label>
          <Textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste the original text here..."
            className="min-h-[150px] glass-input resize-none"
            disabled={isComparing}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Text B (Revised)</label>
          <Textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste the revised text here..."
            className="min-h-[150px] glass-input resize-none"
            disabled={isComparing}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleCompare}
          disabled={!textA.trim() || !textB.trim() || isComparing}
          className="gap-2"
        >
          {isComparing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <ArrowLeftRight className="w-4 h-4" />
              Compare Texts
            </>
          )}
        </Button>
      </div>

      {resultA && resultB && (
        <div className="space-y-6 animate-fade-in">
          {/* Score comparison */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <h4 className="text-sm text-muted-foreground mb-2">Text A Score</h4>
              <TrustScoreMeter score={resultA.trustScore} isAnimating={true} size="small" />
            </div>

            <div className="glass-card rounded-xl p-4 flex flex-col items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-muted-foreground mb-2" />
              {scoreDiff && (
                <span className={`font-semibold ${scoreDiff.color}`}>
                  {scoreDiff.text}
                </span>
              )}
            </div>

            <div className="glass-card rounded-xl p-4 text-center">
              <h4 className="text-sm text-muted-foreground mb-2">Text B Score</h4>
              <TrustScoreMeter score={resultB.trustScore} isAnimating={true} size="small" />
            </div>
          </div>

          {/* Claims comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-medium mb-3">Text A Claims</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified</span>
                  <span className="text-success font-medium">
                    {resultA.claims.filter(c => c.status === "verified").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questionable</span>
                  <span className="text-accent font-medium">
                    {resultA.claims.filter(c => c.status === "questionable").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">False</span>
                  <span className="text-destructive font-medium">
                    {resultA.claims.filter(c => c.status === "false").length}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <h4 className="font-medium mb-3">Text B Claims</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified</span>
                  <span className="text-success font-medium">
                    {resultB.claims.filter(c => c.status === "verified").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questionable</span>
                  <span className="text-accent font-medium">
                    {resultB.claims.filter(c => c.status === "questionable").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">False</span>
                  <span className="text-destructive font-medium">
                    {resultB.claims.filter(c => c.status === "false").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonMode;
