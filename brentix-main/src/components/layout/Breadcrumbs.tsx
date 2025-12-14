import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
  "": "Dashboard",
  "signals": "Signals",
  "trades": "Trades",
  "analysis": "Analysis",
  "history": "History",
  "reports": "Reports",
  "settings": "Settings",
  "admin": "Admin",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on dashboard (root)
  if (pathSegments.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 px-6 py-2 border-b border-border bg-background/50">
      <Link 
        to="/" 
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-sm text-foreground font-medium">{name}</span>
            ) : (
              <Link 
                to={path} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
