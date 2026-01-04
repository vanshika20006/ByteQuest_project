import { useState } from "react";
import { Shield, Loader2, Sparkles, FileText, AlertCircle, Upload, Link, Bot, GitCompare, ExternalLink, AlertTriangle, CheckCircle2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TrustScoreMeter from "./TrustScoreMeter";
import HighlightedText from "./HighlightedText";
import CitationsList from "./CitationsList";
import VerificationHistory from "./VerificationHistory";
import DocumentUpload from "./DocumentUpload";
import ExportResults from "./ExportResults";
import UrlInput from "./UrlInput";
import AiDetectionResult from "./AiDetectionResult";
import ComparisonMode from "./ComparisonMode";

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
  verified?: boolean;
  httpStatus?: number;
  pageTitle?: string;
}

interface AiDetectionData {
  isAiGenerated: boolean;
  confidence: number;
  indicators: { type: "ai" | "human"; description: string; example?: string }[];
  analysis: string;
}

interface VerificationResult {
  trustScore: number;
  claims: Claim[];
  citations: Citation[];
  aiDetection?: AiDetectionData;
  hallucinationRisk?: "Low" | "Medium" | "High";
  hallucinationRiskReason?: string;
  analysisSummary?: string;
  source?: string;
}

const VerificationDashboard = () => {
  const [inputText, setInputText] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifyingCitations, setIsVerifyingCitations] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("verify");
  const { toast } = useToast();

  const saveToHistory = async (text: string, verificationResult: VerificationResult) => {
    try {
      const textPreview = text.substring(0, 200) + (text.length > 200 ? "..." : "");
      
      const { error } = await supabase.from("verification_history").insert({
        text_preview: textPreview,
        full_text: text,
        trust_score: verificationResult.trustScore,
        claims: JSON.parse(JSON.stringify(verificationResult.claims)),
        citations: JSON.parse(JSON.stringify(verificationResult.citations))
      });

      if (error) {
        console.error("Failed to save to history:", error);
      } else {
        setHistoryRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error("Failed to save to history:", error);
    }
  };

  const handleVerify = async () => {
    if (!inputText.trim()) return;
    
    setIsVerifying(true);
    setShowResults(false);
    
    try {
      // Run content verification and AI detection in parallel
      const [verifyResponse, aiDetectResponse] = await Promise.all([
        supabase.functions.invoke("verify-content", { body: { text: inputText } }),
        supabase.functions.invoke("detect-ai", { body: { text: inputText } })
      ]);

      if (verifyResponse.error) {
        throw new Error(verifyResponse.error.message || "Verification failed");
      }

      if (verifyResponse.data.error) {
        throw new Error(verifyResponse.data.error);
      }

      const verificationResult: VerificationResult = {
        trustScore: verifyResponse.data.trustScore || 50,
        claims: verifyResponse.data.claims || [],
        citations: verifyResponse.data.citations || [],
        hallucinationRisk: verifyResponse.data.hallucinationRisk,
        hallucinationRiskReason: verifyResponse.data.hallucinationRiskReason,
        analysisSummary: verifyResponse.data.analysisSummary,
        source: verifyResponse.data.source,
        aiDetection: aiDetectResponse.data && !aiDetectResponse.error ? {
          isAiGenerated: aiDetectResponse.data.isAiGenerated || false,
          confidence: aiDetectResponse.data.confidence || 50,
          indicators: aiDetectResponse.data.indicators || [],
          analysis: aiDetectResponse.data.analysis || ""
        } : undefined
      };

      setResult(verificationResult);
      setShowResults(true);
      
      // Save to history
      await saveToHistory(inputText, verificationResult);
      
      toast({
        title: "Verification complete",
        description: `Trust score: ${verifyResponse.data.trustScore}%`,
      });
    } catch (error) {
      console.error("Verification failed:", error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCitations = async () => {
    if (!result?.citations.length) return;

    setIsVerifyingCitations(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-citations", {
        body: { citations: result.citations }
      });

      if (error) {
        throw new Error(error.message || "Citation verification failed");
      }

      if (data.citations) {
        setResult(prev => prev ? { ...prev, citations: data.citations } : prev);
        toast({
          title: "Citations verified",
          description: "All citation URLs have been checked"
        });
      }
    } catch (error) {
      console.error("Citation verification failed:", error);
      toast({
        title: "Citation verification failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsVerifyingCitations(false);
    }
  };

  const handleLoadFromHistory = (item: {
    text: string;
    trustScore: number;
    claims: Claim[];
    citations: Citation[];
  }) => {
    setInputText(item.text);
    setResult({
      trustScore: item.trustScore,
      claims: item.claims,
      citations: item.citations
    });
    setShowResults(true);
  };

  const handleUrlExtracted = (text: string, url?: string) => {
    setInputText(text);
    setSourceUrl(url || null);
  };

  const characterCount = inputText.length;
  const maxCharacters = 5000;

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Content Verification</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="gradient-text-primary">Verify</span> AI-Generated Content
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste AI-generated text, upload documents, or enter a URL to detect fake citations, 
            questionable claims, and get a comprehensive trust score.
          </p>
        </header>

        {/* Mode Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="verify" className="gap-2">
              <Shield className="w-4 h-4" />
              Verify Content
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Compare Texts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="mt-6">
            {/* History Section */}
            <div className="mb-8">
              <VerificationHistory 
                onLoadVerification={handleLoadFromHistory}
                refreshTrigger={historyRefreshTrigger}
              />
            </div>

            {/* Main Input Section */}
            <div className="glass-card rounded-2xl p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-display font-semibold">Input Content</h2>
                <span className={`ml-auto text-sm ${
                  characterCount > maxCharacters ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
                </span>
              </div>

              {/* URL Input */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Scrape from URL</span>
                </div>
                <UrlInput 
                  onTextExtracted={handleUrlExtracted}
                  disabled={isVerifying}
                />
              </div>

              <div className="relative flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Document Upload */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Upload Document</span>
                </div>
                <DocumentUpload 
                  onTextExtracted={(text) => setInputText(text)}
                  disabled={isVerifying}
                />
              </div>

              <div className="relative flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or paste text</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your AI-generated text here for verification..."
                className="min-h-[200px] glass-input resize-none text-base leading-relaxed focus:ring-2 focus:ring-primary/50 transition-all"
              />

              {sourceUrl && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="w-4 h-4" />
                  <span>Source: {sourceUrl}</span>
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleVerify}
                  disabled={!inputText.trim() || isVerifying || characterCount > maxCharacters}
                  size="lg"
                  className="px-8 py-6 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-primary transition-all hover:scale-105 disabled:hover:scale-100"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Verify Content
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isVerifying && (
              <div className="glass-card rounded-2xl p-12 text-center mb-8 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">Analyzing Content</h3>
                <p className="text-muted-foreground">
                  AI is checking claims, verifying citations, detecting AI authorship, and calculating trust score...
                </p>
                <div className="mt-6 h-1 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
                  <div className="h-full bg-primary shimmer rounded-full w-full" />
                </div>
              </div>
            )}

            {/* Results Section */}
            {showResults && result && (
              <div className="space-y-8 animate-fade-in">
                {/* Results Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    <h2 className="font-display font-semibold text-xl">Verification Results</h2>
                  </div>
                  <ExportResults 
                    inputText={inputText}
                    trustScore={result.trustScore}
                    claims={result.claims}
                    citations={result.citations}
                  />
                </div>

                {/* Results Grid - Updated to 4 columns when AI detection is available */}
                <div className={`grid gap-6 ${result.aiDetection ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
                  {/* Trust Score */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center animate-scale-in">
                    <h3 className="font-display font-medium text-muted-foreground mb-4">Trust Score</h3>
                    <TrustScoreMeter score={result.trustScore} isAnimating={true} />
                    {result.source && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Server className="w-3 h-3" />
                        <span>{result.source === "backend+ai" ? "Verified by Backend + AI" : "AI Fallback"}</span>
                      </div>
                    )}
                  </div>

                  {/* Claims Summary */}
                  <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: "100ms" }}>
                    <h3 className="font-display font-medium text-muted-foreground mb-4">Claims Analysis</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verified</span>
                        <span className="text-success font-semibold">
                          {result.claims.filter(c => c.status === "verified").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Questionable</span>
                        <span className="text-accent font-semibold">
                          {result.claims.filter(c => c.status === "questionable").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">False</span>
                        <span className="text-destructive font-semibold">
                          {result.claims.filter(c => c.status === "false").length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hallucination Risk */}
                  <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: "150ms" }}>
                    <h3 className="font-display font-medium text-muted-foreground mb-4">Hallucination Risk</h3>
                    <div className="flex items-center gap-3 mb-3">
                      {result.hallucinationRisk === "Low" && (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="w-6 h-6" />
                          <span className="text-2xl font-bold">Low</span>
                        </div>
                      )}
                      {result.hallucinationRisk === "Medium" && (
                        <div className="flex items-center gap-2 text-accent">
                          <AlertTriangle className="w-6 h-6" />
                          <span className="text-2xl font-bold">Medium</span>
                        </div>
                      )}
                      {result.hallucinationRisk === "High" && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="w-6 h-6" />
                          <span className="text-2xl font-bold">High</span>
                        </div>
                      )}
                      {!result.hallucinationRisk && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertTriangle className="w-6 h-6" />
                          <span className="text-2xl font-bold">Unknown</span>
                        </div>
                      )}
                    </div>
                    {result.hallucinationRiskReason && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {result.hallucinationRiskReason}
                      </p>
                    )}
                  </div>

                  {/* AI Detection */}
                  {result.aiDetection && (
                    <AiDetectionResult
                      isAiGenerated={result.aiDetection.isAiGenerated}
                      confidence={result.aiDetection.confidence}
                      indicators={result.aiDetection.indicators}
                      analysis={result.aiDetection.analysis}
                    />
                  )}
                </div>

                {/* Analysis Summary from AI */}
                {result.analysisSummary && (
                  <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: "250ms" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-5 h-5 text-primary" />
                      <h3 className="font-display font-medium">AI Analysis Summary</h3>
                    </div>
                    <p className="text-muted-foreground">{result.analysisSummary}</p>
                  </div>
                )}

                {/* Citations Summary */}
                <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: "200ms" }}>
                  <h3 className="font-display font-medium text-muted-foreground mb-4">Citations Check</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Valid</span>
                      <span className="text-success font-semibold">
                        {result.citations.filter(c => c.status === "valid").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Broken</span>
                      <span className="text-accent font-semibold">
                        {result.citations.filter(c => c.status === "broken").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fake</span>
                      <span className="text-destructive font-semibold">
                        {result.citations.filter(c => c.status === "fake").length}
                      </span>
                    </div>
                  </div>
                  {result.citations.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyCitations}
                      disabled={isVerifyingCitations}
                      className="w-full mt-4 gap-2"
                    >
                      {isVerifyingCitations ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking URLs...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Verify URLs
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Highlighted Text with Source Suggestions */}
                {result.claims.length > 0 && (
                  <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
                    <h3 className="font-display font-medium text-muted-foreground mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Analyzed Text
                    </h3>
                    <HighlightedText originalText={inputText} claims={result.claims} />
                    <p className="text-sm text-muted-foreground mt-3">
                      <span className="text-success">● Verified</span>
                      <span className="mx-3 text-accent">● Questionable</span>
                      <span className="text-destructive">● False</span>
                      <span className="ml-3">— Hover over highlights for details</span>
                    </p>

                    {/* Source Suggestions for questionable/false claims */}
                    {result.claims.some(c => c.suggestedSources?.length) && (
                      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Suggested Sources for Verification
                        </h4>
                        <div className="space-y-3">
                          {result.claims
                            .filter(c => c.suggestedSources?.length && c.status !== "verified")
                            .map((claim, i) => (
                              <div key={i} className="text-sm">
                                <p className="text-muted-foreground mb-1 line-clamp-1">
                                  "{claim.text.substring(0, 80)}..."
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {claim.suggestedSources?.map((source, j) => (
                                    <a
                                      key={j}
                                      href={source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {new URL(source).hostname}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Citations List */}
                {result.citations.length > 0 && (
                  <div className="animate-fade-in" style={{ animationDelay: "400ms" }}>
                    <h3 className="font-display font-medium text-muted-foreground mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Citation Issues
                    </h3>
                    <CitationsList citations={result.citations} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <div className="glass-card rounded-2xl p-6 md:p-8">
              <ComparisonMode />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VerificationDashboard;
