import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// External backend API
const BACKEND_API_URL = "https://ps03-ai-verifier.onrender.com/verify";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting hybrid verification...");

    // Step 1: Call external backend for factual verification (source of truth)
    console.log("Calling external backend for verification...");
    let backendResult: any = null;
    let backendError: string | null = null;

    try {
      const backendResponse = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error("Backend API error:", backendResponse.status, errorText);
        backendError = `Backend API error: ${backendResponse.status}`;
      } else {
        backendResult = await backendResponse.json();
        console.log("Backend response received:", JSON.stringify(backendResult).substring(0, 500));
      }
    } catch (error) {
      console.error("Failed to call backend API:", error);
      backendError = error instanceof Error ? error.message : "Unknown backend error";
    }

    // Step 2: Call Lovable AI for supplementary analysis (AI detection, hallucination risk, source suggestions)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI for supplementary analysis...");

    const systemPrompt = `You are an AI analysis assistant. Your job is to provide supplementary insights for content verification. You are NOT responsible for determining claim truth or trust scores - that comes from another system.

Your responsibilities:
1. **Hallucination Risk Assessment**: Evaluate the overall risk of AI hallucinations in the text:
   - "Low": Text appears grounded with specific, verifiable details
   - "Medium": Some vague claims or unsubstantiated assertions
   - "High": Contains typical AI hallucination patterns like fabricated sources, fake statistics, or non-existent studies

2. **Source Suggestions**: For each claim that appears questionable or could benefit from verification, suggest 1-2 reliable sources where users can verify the information. Focus on authoritative sources like:
   - Government websites (.gov)
   - Academic institutions (.edu)
   - Reputable news organizations
   - Official organization websites
   - Wikipedia for general topics

3. **Analysis Summary**: Provide a brief (2-3 sentences) summary of the content's overall reliability from an AI perspective.

Respond ONLY with valid JSON in this exact format:
{
  "hallucinationRisk": "Low" | "Medium" | "High",
  "hallucinationRiskReason": "<brief explanation of why this risk level>",
  "sourceSuggestions": [
    {
      "claimText": "<the claim text that needs verification>",
      "suggestedSources": ["<URL 1>", "<URL 2>"]
    }
  ],
  "analysisSummary": "<2-3 sentence summary>"
}`;

    let aiResult: any = null;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze this text for hallucination risk and suggest verification sources:\n\n${text}` }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errorText);
      } else {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        if (content) {
          console.log("AI response received:", content.substring(0, 300));
          try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
            const jsonStr = jsonMatch[1].trim();
            aiResult = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to call AI gateway:", error);
    }

    // Step 3: Merge results - Backend is source of truth, AI provides supplementary data
    let finalResult: any;

    if (backendResult) {
      // Backend succeeded - use it as source of truth
      console.log("Using backend as source of truth");
      
      // Normalize backend response to our expected format
      const claims = (backendResult.claims || []).map((claim: any) => {
        // Find matching source suggestion from AI
        const aiSuggestion = aiResult?.sourceSuggestions?.find(
          (s: any) => claim.text && s.claimText && 
            (claim.text.toLowerCase().includes(s.claimText.toLowerCase().substring(0, 30)) ||
             s.claimText.toLowerCase().includes(claim.text.toLowerCase().substring(0, 30)))
        );

        return {
          text: claim.text || claim.claim || "",
          status: normalizeClaimStatus(claim.status || claim.verdict || claim.verification_status),
          note: claim.note || claim.explanation || claim.reason || "",
          suggestedSources: aiSuggestion?.suggestedSources || claim.suggestedSources || []
        };
      });

      const citations = (backendResult.citations || []).map((citation: any) => ({
        source: citation.source || citation.name || "",
        url: citation.url || "unknown",
        status: normalizeCitationStatus(citation.status || citation.validity),
        reason: citation.reason || citation.explanation || ""
      }));

      finalResult = {
        trustScore: backendResult.trustScore ?? backendResult.trust_score ?? 50,
        claims,
        citations,
        hallucinationRisk: aiResult?.hallucinationRisk || "Medium",
        hallucinationRiskReason: aiResult?.hallucinationRiskReason || "Unable to assess",
        analysisSummary: aiResult?.analysisSummary || "",
        source: "backend+ai"
      };
    } else {
      // Backend failed - return error but still provide AI insights if available
      console.log("Backend failed, returning error with AI insights");
      
      finalResult = {
        error: backendError || "Backend verification failed",
        trustScore: 0,
        claims: [],
        citations: [],
        hallucinationRisk: aiResult?.hallucinationRisk || "Unknown",
        hallucinationRiskReason: aiResult?.hallucinationRiskReason || "Backend verification required",
        analysisSummary: aiResult?.analysisSummary || "Unable to verify without backend",
        source: "ai-only-fallback"
      };
    }

    console.log("Final merged result:", JSON.stringify(finalResult).substring(0, 500));

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in verify-content function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to normalize claim status from various backend formats
function normalizeClaimStatus(status: string): "verified" | "questionable" | "false" {
  if (!status) return "questionable";
  
  const s = status.toLowerCase();
  if (s.includes("true") || s.includes("verified") || s.includes("accurate") || s.includes("correct")) {
    return "verified";
  }
  if (s.includes("false") || s.includes("incorrect") || s.includes("wrong") || s.includes("fake")) {
    return "false";
  }
  return "questionable";
}

// Helper function to normalize citation status from various backend formats
function normalizeCitationStatus(status: string): "valid" | "broken" | "fake" {
  if (!status) return "broken";
  
  const s = status.toLowerCase();
  if (s.includes("valid") || s.includes("exists") || s.includes("found") || s.includes("working")) {
    return "valid";
  }
  if (s.includes("fake") || s.includes("fabricated") || s.includes("nonexistent") || s.includes("false")) {
    return "fake";
  }
  return "broken";
}
