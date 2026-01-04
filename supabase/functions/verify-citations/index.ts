import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Citation {
  source: string;
  url: string;
  status: "valid" | "broken" | "fake";
  reason: string;
}

interface VerifiedCitation extends Citation {
  verified: boolean;
  httpStatus?: number;
  pageTitle?: string;
  contentPreview?: string;
}

async function checkUrl(url: string): Promise<{ exists: boolean; status: number; title?: string; preview?: string }> {
  try {
    if (!url || url === "unknown" || !url.startsWith("http")) {
      return { exists: false, status: 0 };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentVerifier/1.0)",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { exists: false, status: response.status };
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract preview (first meaningful text)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 300);

    return { exists: true, status: response.status, title, preview: textContent };
  } catch (error) {
    console.error("Error checking URL:", url, error);
    return { exists: false, status: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { citations } = await req.json();

    if (!citations || !Array.isArray(citations)) {
      return new Response(
        JSON.stringify({ error: "Citations array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying", citations.length, "citations...");

    const verifiedCitations: VerifiedCitation[] = await Promise.all(
      citations.map(async (citation: Citation) => {
        const result = await checkUrl(citation.url);
        
        let updatedStatus = citation.status;
        let updatedReason = citation.reason;

        if (result.exists) {
          if (citation.status === "broken") {
            updatedStatus = "valid";
            updatedReason = `URL is accessible. Page title: "${result.title || 'Unknown'}"`;
          }
        } else {
          if (citation.status === "valid") {
            updatedStatus = "broken";
            updatedReason = result.status 
              ? `URL returned HTTP ${result.status}` 
              : "URL is not accessible or does not exist";
          }
        }

        return {
          ...citation,
          status: updatedStatus,
          reason: updatedReason,
          verified: true,
          httpStatus: result.status,
          pageTitle: result.title,
          contentPreview: result.preview,
        };
      })
    );

    console.log("Citation verification complete");

    return new Response(JSON.stringify({ citations: verifiedCitations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error verifying citations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
