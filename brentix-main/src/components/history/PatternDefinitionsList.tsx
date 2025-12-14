import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatternDefinitions } from "@/hooks/usePatterns";
import { TrendingUp, TrendingDown, Zap, BarChart3 } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  MOMENTUM: <Zap className="h-4 w-4" />,
  REVERSAL: <TrendingUp className="h-4 w-4" />,
  TREND: <TrendingDown className="h-4 w-4" />,
  VOLATILITY: <BarChart3 className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  MOMENTUM: "text-blue-400",
  REVERSAL: "text-green-400",
  TREND: "text-purple-400",
  VOLATILITY: "text-orange-400",
};

interface PatternDefinitionsListProps {
  onSelectPattern?: (patternType: string) => void;
  selectedPatterns?: string[];
}

export function PatternDefinitionsList({ onSelectPattern, selectedPatterns = [] }: PatternDefinitionsListProps) {
  const { data: definitions, isLoading } = usePatternDefinitions();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!definitions || definitions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pattern definitions found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {definitions.map((def) => {
        const isSelected = selectedPatterns.includes(def.pattern_type);
        return (
          <Card 
            key={def.id} 
            className={`border-0 bg-card/50 cursor-pointer transition-all hover:bg-card/70 ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSelectPattern?.(def.pattern_type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${categoryColors[def.category]}`}>
                  {categoryIcons[def.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{def.name}</h4>
                    <span className={`text-xs ${
                      def.direction === "BULLISH" ? "text-chart-2" : 
                      def.direction === "BEARISH" ? "text-chart-5" : 
                      "text-muted-foreground"
                    }`}>
                      {def.direction}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {def.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
