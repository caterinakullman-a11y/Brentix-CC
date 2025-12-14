import { useState } from "react";
import { Eye, EyeOff, RotateCcw, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DashboardWidget, DashboardWidgetId } from "@/hooks/useDashboardLayout";

interface DashboardControlsProps {
  isEditMode: boolean;
  hasChanges: boolean;
  onToggleEditMode: () => void;
  onReset: () => void;
  onSave: () => void;
  widgets: DashboardWidget[];
  onToggleVisibility: (id: DashboardWidgetId) => void;
}

export function DashboardControls({
  isEditMode,
  hasChanges,
  onToggleEditMode,
  onReset,
  onSave,
  widgets,
  onToggleVisibility,
}: DashboardControlsProps) {
  const [showWidgetList, setShowWidgetList] = useState(false);

  // Compact icon button when not in edit mode
  if (!isEditMode) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleEditMode}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Anpassa layout</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="default"
        size="sm"
        onClick={onToggleEditMode}
        className="gap-2"
      >
        <Check className="h-4 w-4" />
        Klar
      </Button>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWidgetList(!showWidgetList)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Visa/Dölj
        </Button>
        
        {showWidgetList && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowWidgetList(false)}
            />
            <div className="absolute top-full mt-2 right-0 z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[200px]">
              {widgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => onToggleVisibility(widget.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    widget.visible ? "hover:bg-muted" : "opacity-50 hover:bg-muted"
                  )}
                >
                  <span>{widget.icon}</span>
                  <span className="flex-1 text-left">{widget.label}</span>
                  {widget.visible ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" />
        Återställ
      </Button>

      {hasChanges && (
        <span className="text-xs text-muted-foreground animate-pulse">
          • Osparade ändringar
        </span>
      )}
    </div>
  );
}
