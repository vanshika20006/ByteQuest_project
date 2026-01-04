import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Detecting AI-generated content...");

    const systemPrompt = `You are an expert at detecting AI-generated content. Analyze the provided text and determine if it was written by an AI or a human.

Look for these AI-generated content indicators:
- Overly polished and consistent tone throughout
- Lack of personal anecdotes or genuine emotional depth
- Repetitive sentence structures or transitions
- Generic phrases like "In conclusion", "It's important to note", "Furthermore"
- Perfectly balanced arguments without strong opinions
- Lack of typos, colloquialisms, or informal language
- Overly comprehensive coverage of topics
- Formulaic structure (intro, body, conclusion)
- Use of filler phrases to extend content
- Absence of specific personal experiences or unique perspectives

Respond ONLY with valid JSON in this exact format:
{
  "isAiGenerated": <boolean>,
  "confidence": <number 0-100>,
  "indicators": [
    {
      "type": "ai" | "human",
      "description": "<what pattern was detected>",
      "example": "<quoted example from text if applicable>"
    }
  ],
  "analysis": "<2-3 sentence summary of your assessment>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this text for AI-generated content:\n\n${text.substring(0, 4000)}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI detection response received");

    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      result = {
        isAiGenerated: false,
        confidence: 50,
        indicators: [],
        analysis: "Unable to determine AI authorship",
        error: "Failed to parse AI analysis"
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in detect-ai function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
