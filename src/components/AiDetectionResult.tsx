import { Bot, User, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AiIndicator {
  type: "ai" | "human";
  description: string;
  example?: string;
}

interface AiDetectionResultProps {
  isAiGenerated: boolean;
  confidence: number;
  indicators: AiIndicator[];
  analysis: string;
}

const AiDetectionResult = ({ isAiGenerated, confidence, indicators, analysis }: AiDetectionResultProps) => {
  const [expanded, setExpanded] = useState(false);

  const aiIndicators = indicators.filter(i => i.type === "ai");
  const humanIndicators = indicators.filter(i => i.type === "human");

  return (
    <div className="glass-card rounded-2xl p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-medium text-muted-foreground">AI Detection</h3>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
          isAiGenerated 
            ? "bg-accent/20 text-accent" 
            : "bg-success/20 text-success"
        )}>
          {isAiGenerated ? (
            <>
              <Bot className="w-4 h-4" />
              AI Generated
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              Human Written
            </>
          )}
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold">{confidence}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAiGenerated ? "bg-accent" : "bg-success"
            )}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Analysis summary */}
      <p className="text-sm text-muted-foreground mb-4">{analysis}</p>

      {/* Expandable indicators */}
      {indicators.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? "Hide" : "Show"} detection indicators ({indicators.length})
          </button>

          {expanded && (
            <div className="mt-4 space-y-4">
              {aiIndicators.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Indicators
                  </h4>
                  <ul className="space-y-2">
                    {aiIndicators.map((indicator, i) => (
                      <li key={i} className="text-sm bg-accent/10 rounded-lg p-3">
                        <p className="text-foreground">{indicator.description}</p>
                        {indicator.example && (
                          <p className="text-muted-foreground mt-1 italic text-xs">
                            "{indicator.example}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {humanIndicators.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Human Indicators
                  </h4>
                  <ul className="space-y-2">
                    {humanIndicators.map((indicator, i) => (
                      <li key={i} className="text-sm bg-success/10 rounded-lg p-3">
                        <p className="text-foreground">{indicator.description}</p>
                        {indicator.example && (
                          <p className="text-muted-foreground mt-1 italic text-xs">
                            "{indicator.example}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiDetectionResult;
