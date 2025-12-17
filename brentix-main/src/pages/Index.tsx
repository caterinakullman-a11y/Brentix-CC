import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { DualSignalCard } from "@/components/dashboard/DualSignalCard";
import { TechnicalIndicatorsCompact } from "@/components/dashboard/TechnicalIndicatorsCompact";
import { PriceCollectionWidget } from "@/components/dashboard/PriceCollectionWidget";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { AdminPendingWidget } from "@/components/dashboard/AdminPendingWidget";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RuleInsightsWidget } from "@/components/dashboard/RuleInsightsWidget";
import { FourWayTradeButtons, OpenPositions } from "@/components/trading";
import { AdvancedToolsPanel } from "@/components/analysis/AdvancedToolsPanel";
import { usePriceData } from "@/hooks/usePriceData";
import { useActiveSignal } from "@/hooks/useSignals";
import { useTechnicalIndicators } from "@/hooks/useTechnicalIndicators";
import { useTodayStats } from "@/hooks/useTodayStats";
import { useActiveSignalsCount } from "@/hooks/useActiveSignalsCount";
import { useRealtimeSubscriptions } from "@/hooks/useRealtimeSubscriptions";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useDashboardLayout, type DashboardWidgetId } from "@/hooks/useDashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { GripVertical, Check, RotateCcw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Draggable widget wrapper
interface DraggableWidgetProps {
  children: React.ReactNode;
  isEditMode: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

function DraggableWidget({
  children,
  isEditMode,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: DraggableWidgetProps) {
  return (
    <div
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "relative transition-all duration-200",
        isEditMode && "cursor-move",
        isEditMode && !isDragging && "ring-2 ring-dashed ring-primary/30 rounded-xl p-1",
        isDragging && "opacity-50 scale-[0.98]",
        isOver && "ring-primary ring-2 ring-solid rounded-xl"
      )}
    >
      {isEditMode && (
        <div className="absolute -left-3 top-4 z-10 bg-primary text-primary-foreground rounded-lg p-1.5 shadow-lg cursor-grab active:cursor-grabbing hover:bg-primary/90 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      {isOver && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full animate-pulse" />
      )}
      
      {children}
    </div>
  );
}

const Index = () => {
  useRealtimeSubscriptions();
  const { isAdmin } = useAuth();
  
  const { settings, isLoading: settingsLoading } = useUserSettings();
  const priceData = usePriceData();
  const { signal, isLoading: signalLoading } = useActiveSignal();
  const { indicators, isLoading: indicatorsLoading } = useTechnicalIndicators();
  const stats = useTodayStats();
  const { count: activeSignalsCount } = useActiveSignalsCount();

  const {
    widgets,
    visibleWidgets,
    isEditMode,
    hasChanges,
    moveWidget,
    toggleWidgetVisibility,
    resetLayout,
    saveCurrentLayout,
    toggleEditMode,
  } = useDashboardLayout();

  const [draggedId, setDraggedId] = useState<DashboardWidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<DashboardWidgetId | null>(null);

  const showSkeleton = settings?.show_loading_skeletons !== false && 
    (priceData.isLoading && signalLoading && indicatorsLoading && stats.isLoading);

  const handleDragStart = (id: DashboardWidgetId) => setDraggedId(id);

  const handleDragEnd = () => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const fromIndex = visibleWidgets.findIndex(w => w.id === draggedId);
      const toIndex = visibleWidgets.findIndex(w => w.id === dragOverId);
      if (fromIndex !== -1 && toIndex !== -1) {
        moveWidget(fromIndex, toIndex);
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: DashboardWidgetId) => {
    e.preventDefault();
    if (draggedId && id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = () => setDragOverId(null);

  // Use CURRENT price from priceData, not signal's saved price
  const currentPrice = priceData.currentPrice;

  // Widget content map - now with dual signals and four-way trade buttons
  const widgetContent: Record<DashboardWidgetId, React.ReactNode> = {
    "admin-pending": isAdmin ? <AdminPendingWidget /> : null,
    "quick-trade": <FourWayTradeButtons />,
    "open-positions": <OpenPositions />,
    "advanced-tools": <AdvancedToolsPanel />,
    "rule-insights": <RuleInsightsWidget />,
    "price-overview": (
      <div className="space-y-6">
        {/* Dual Signal Cards - BULL and BEAR side by side */}
        <div data-tour="signal-card">
          <DualSignalCard />
        </div>

        {/* Price Chart - Full Width */}
        <div data-tour="price-card">
          <PriceChart />
        </div>

        {/* Technical Indicators + Data Collection Status */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div data-tour="indicators" className="lg:col-span-3">
            <TechnicalIndicatorsCompact
              rsi={indicators?.rsi_14 ?? 0}
              macd={indicators?.macd ?? 0}
              macdSignal={indicators?.macd_signal ?? 0}
              bollingerUpper={indicators?.bollinger_upper ?? 0}
              bollingerMiddle={indicators?.bollinger_middle ?? 0}
              bollingerLower={indicators?.bollinger_lower ?? 0}
              currentPrice={currentPrice}
              isLoading={indicatorsLoading}
              hasData={!!indicators}
            />
          </div>
          <div>
            <PriceCollectionWidget />
          </div>
        </div>
      </div>
    ),
    "signal-card": null,
    "technical-indicators": null,
    "stats-cards": (
      <StatsCards
        dailyPL={stats.dailyPL}
        dailyPLPercent={stats.dailyPLPercent}
        openPositions={stats.openPositions}
        totalExposure={stats.totalExposure}
        todayTrades={stats.todayTrades}
        winners={stats.winners}
        losers={stats.losers}
        winRate={stats.winRate}
        activeSignals={activeSignalsCount}
        isLoading={stats.isLoading}
      />
    ),
  };

  // Filter out null widgets and ones moved to combined view
  const activeVisibleWidgets = visibleWidgets.filter(
    w => widgetContent[w.id] !== null && w.id !== "signal-card" && w.id !== "technical-indicators"
  );

  return (
    <MainLayout onToggleLayoutMode={toggleEditMode} isLayoutMode={isEditMode}>
      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
            {isEditMode && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Redigeringsläge</span>
                  <span className="text-muted-foreground ml-2 hidden sm:inline">– Dra för att flytta</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetLayout} className="h-7 text-xs gap-1.5">
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Återställ</span>
                  </Button>
                  <Button variant="default" size="sm" onClick={toggleEditMode} className="h-7 text-xs gap-1.5">
                    <Check className="h-3 w-3" />
                    Klar
                  </Button>
                </div>
              </div>
            )}

            {/* Render widgets */}
            <div className="space-y-6">
              {activeVisibleWidgets.map((widget) => (
                <DraggableWidget
                  key={widget.id}
                  isEditMode={isEditMode}
                  isDragging={draggedId === widget.id}
                  isOver={dragOverId === widget.id}
                  onDragStart={() => handleDragStart(widget.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, widget.id)}
                  onDrop={handleDrop}
                >
                  {widgetContent[widget.id]}
                </DraggableWidget>
              ))}
            </div>

            {/* Hidden widgets indicator */}
            {isEditMode && widgets.some(w => !w.visible) && (
              <div className="text-center text-sm text-muted-foreground py-4 border-t border-dashed border-border">
                {widgets.filter(w => !w.visible).length} dold(a) sektion(er)
              </div>
            )}
        </div>
      )}
    </MainLayout>
  );
};

export default Index;
