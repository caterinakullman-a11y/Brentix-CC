import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

// Widget IDs - these must match the keys used in Index.tsx
export type DashboardWidgetId = 
  | "admin-pending"
  | "quick-trade"
  | "open-positions"
  | "price-overview"
  | "signal-card"
  | "technical-indicators"
  | "stats-cards"
  | "advanced-tools"
  | "rule-insights";

export interface DashboardWidget {
  id: DashboardWidgetId;
  label: string;
  icon: string;
  visible: boolean;
}

// Default widget order
export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidget[] = [
  { id: "admin-pending", label: "Väntande användare", icon: "👥", visible: true },
  { id: "quick-trade", label: "Manuell Handel", icon: "⚡", visible: true },
  { id: "open-positions", label: "Öppna Positioner", icon: "📂", visible: true },
  { id: "price-overview", label: "Prisöversikt & Graf", icon: "📈", visible: true },
  { id: "rule-insights", label: "Regelinsikter", icon: "🏆", visible: true },
  { id: "advanced-tools", label: "Avancerade Analysverktyg", icon: "🛠️", visible: true },
  { id: "signal-card", label: "Handelssignal", icon: "🎯", visible: true },
  { id: "technical-indicators", label: "Tekniska Indikatorer", icon: "📊", visible: true },
  { id: "stats-cards", label: "Statistik", icon: "📉", visible: true },
];

const STORAGE_KEY = "brentix-dashboard-layout";

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    const storageKey = user?.id ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DashboardWidget[];
        // Merge with defaults to handle new widgets added in updates
        const merged = DEFAULT_DASHBOARD_LAYOUT.map(defaultWidget => {
          const savedWidget = parsed.find(w => w.id === defaultWidget.id);
          return savedWidget || defaultWidget;
        });
        // Also include any saved order
        const orderedMerged = parsed
          .filter(w => merged.find(m => m.id === w.id))
          .map(w => merged.find(m => m.id === w.id)!);
        // Add any new widgets that weren't in saved
        const newWidgets = merged.filter(m => !orderedMerged.find(o => o.id === m.id));
        setWidgets([...orderedMerged, ...newWidgets]);
      } catch (e) {
        console.error("Failed to parse dashboard layout:", e);
        setWidgets(DEFAULT_DASHBOARD_LAYOUT);
      }
    }
  }, [user?.id]);

  // Save layout to localStorage
  const saveLayout = useCallback((newWidgets: DashboardWidget[]) => {
    const storageKey = user?.id ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(newWidgets));
    setHasChanges(false);
  }, [user?.id]);

  // Move a widget to a new position
  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, removed);
      setHasChanges(true);
      return newWidgets;
    });
  }, []);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetId) => {
    setWidgets(prev => {
      const newWidgets = prev.map(w => 
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      );
      setHasChanges(true);
      return newWidgets;
    });
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_DASHBOARD_LAYOUT);
    const storageKey = user?.id ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;
    localStorage.removeItem(storageKey);
    setHasChanges(false);
  }, [user?.id]);

  // Save current layout
  const saveCurrentLayout = useCallback(() => {
    saveLayout(widgets);
  }, [widgets, saveLayout]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (isEditMode && hasChanges) {
      // Auto-save when exiting edit mode
      saveCurrentLayout();
    }
    setIsEditMode(prev => !prev);
  }, [isEditMode, hasChanges, saveCurrentLayout]);

  // Get visible widgets in order
  const visibleWidgets = widgets.filter(w => w.visible);

  return {
    widgets,
    visibleWidgets,
    isEditMode,
    hasChanges,
    moveWidget,
    toggleWidgetVisibility,
    resetLayout,
    saveCurrentLayout,
    toggleEditMode,
    setIsEditMode,
  };
}
