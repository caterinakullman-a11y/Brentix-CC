import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AppearanceSettingsCardProps {
  showLoadingSkeletons: boolean;
  onShowLoadingSkeletonsChange: (value: boolean) => void;
}

export function AppearanceSettingsCard({
  showLoadingSkeletons,
  onShowLoadingSkeletonsChange,
}: AppearanceSettingsCardProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sun className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground">Customize the look of the app</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">Theme</Label>
          {mounted && (
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Sun className="h-4 w-4" />
                <span className="text-sm">Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Moon className="h-4 w-4" />
                <span className="text-sm">Dark</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Monitor className="h-4 w-4" />
                <span className="text-sm">System</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Loading Skeletons Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-border pt-4">
          <div>
            <p className="font-medium text-foreground">Loading Skeletons</p>
            <p className="text-sm text-muted-foreground">
              Show animated placeholders while data loads
            </p>
          </div>
          <Switch
            checked={showLoadingSkeletons}
            onCheckedChange={onShowLoadingSkeletonsChange}
          />
        </div>
      </div>
    </div>
  );
}
