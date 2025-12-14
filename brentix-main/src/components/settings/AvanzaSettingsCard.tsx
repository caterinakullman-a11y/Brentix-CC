import { useState } from "react";
import { Link, ExternalLink, Loader2, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SetupGuideModal } from "./SetupGuideModal";

interface AvanzaSettingsCardProps {
  accountId: string;
  instrumentId: string;
  positionSizeSek: number;
  positionSizeError?: string;
  onAccountIdChange: (value: string) => void;
  onInstrumentIdChange: (value: string) => void;
  onPositionSizeChange: (value: number) => void;
}

export function AvanzaSettingsCard({
  accountId,
  instrumentId,
  positionSizeSek,
  positionSizeError,
  onAccountIdChange,
  onInstrumentIdChange,
  onPositionSizeChange,
}: AvanzaSettingsCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState<boolean | null>(null);

  const isConnected = Boolean(accountId);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-trade-queue', {
        body: { test: true }
      });
      
      if (error) throw error;
      
      if (data?.avanza_configured) {
        setBackendConfigured(true);
        toast({
          title: "Connection Successful",
          description: "Avanza backend is configured and ready for trading",
        });
      } else {
        setBackendConfigured(false);
        toast({
          title: "Backend Not Configured",
          description: "Avanza credentials not set in Edge Function secrets",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setBackendConfigured(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not reach the backend service.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Link className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Avanza</h2>
            <p className="text-sm text-muted-foreground">Auto trading connection</p>
          </div>
        </div>
        <button
          onClick={() => setShowSetupGuide(true)}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      <SetupGuideModal 
        isOpen={showSetupGuide} 
        onClose={() => setShowSetupGuide(false)} 
      />

      <div className="space-y-4">
        {/* Backend Status */}
        <div className="rounded-lg bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  backendConfigured === true ? "bg-primary" : 
                  backendConfigured === false ? "bg-destructive" : "bg-muted-foreground"
                )}
              />
              <span className="text-sm text-muted-foreground">
                {backendConfigured === true ? "Backend configured" : 
                 backendConfigured === false ? "Backend not configured" : 
                 "Backend status unknown"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="h-8 text-xs"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Avanza credentials are securely stored as environment variables. 
            To configure, add <code className="text-[10px] bg-muted px-1 rounded">AVANZA_USERNAME</code>, <code className="text-[10px] bg-muted px-1 rounded">AVANZA_PASSWORD</code>, and <code className="text-[10px] bg-muted px-1 rounded">AVANZA_TOTP_SECRET</code> to your Edge Function secrets.
          </p>
          <a 
            href="https://github.com/Qluxzz/avanza#totp-secret" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            How to get TOTP secret
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Account Status */}
        <div className="flex items-center gap-2 pt-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isConnected ? "bg-primary" : "bg-destructive"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Account configured" : "Account not configured"}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="avanza_account_id" className="text-sm font-medium">
              Account ID
            </Label>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-popover text-[10px] text-muted-foreground rounded z-10 border">
                Find in Avanza URL: /konton/<span className="text-primary">1234567</span>.html
              </div>
            </div>
          </div>
          <Input
            id="avanza_account_id"
            type="text"
            value={accountId}
            onChange={(e) => onAccountIdChange(e.target.value)}
            className="mt-2 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            placeholder="Enter your Avanza account ID"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="avanza_instrument_id" className="text-sm font-medium">
              Instrument ID
            </Label>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover text-[10px] text-muted-foreground rounded z-10 border">
                Find in instrument URL on Avanza. Default <span className="text-primary">2313155</span> = BULL OLJA X15 AVA
              </div>
            </div>
          </div>
          <Input
            id="avanza_instrument_id"
            type="text"
            value={instrumentId}
            onChange={(e) => onInstrumentIdChange(e.target.value)}
            className="mt-2 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            placeholder="2313155"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Default: 2313155 (BULL OLJA X15)
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="position_size_sek" className="text-sm font-medium">
              Position Size (SEK)
            </Label>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-popover text-[10px] text-muted-foreground rounded z-10 border">
                Maximum SEK amount to invest per trade signal
              </div>
            </div>
          </div>
          <Input
            id="position_size_sek"
            type="number"
            value={positionSizeSek}
            onChange={(e) => onPositionSizeChange(Number(e.target.value))}
            className={cn(
              "mt-2 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary",
              positionSizeError && "border-destructive"
            )}
            min={100}
          />
          {positionSizeError && (
            <p className="mt-1 text-xs text-destructive">
              {positionSizeError}
            </p>
          )}
        </div>

        <p className="text-[10px] text-destructive">
          Auto trading uses the unofficial Avanza API. Use at your own risk.
        </p>
      </div>
    </div>
  );
}
