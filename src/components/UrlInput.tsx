import { useState } from "react";
import { Link, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UrlInputProps {
  onTextExtracted: (text: string, sourceUrl?: string) => void;
  disabled?: boolean;
}

const UrlInput = ({ onTextExtracted, disabled }: UrlInputProps) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-url", {
        body: { url: url.trim() }
      });

      if (error) {
        throw new Error(error.message || "Failed to scrape URL");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.content) {
        throw new Error("No content extracted from URL");
      }

      onTextExtracted(data.content, data.sourceUrl);
      toast({
        title: "URL scraped successfully",
        description: `Extracted ${data.content.length.toLocaleString()} characters from ${data.title || url}`
      });
    } catch (error) {
      console.error("URL scraping error:", error);
      toast({
        title: "Failed to scrape URL",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="pl-10"
            disabled={disabled || isLoading}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
        </div>
        <Button 
          onClick={handleScrape} 
          disabled={!url.trim() || disabled || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              Scrape
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a URL to automatically extract and verify the article content
      </p>
    </div>
  );
};

export default UrlInput;
