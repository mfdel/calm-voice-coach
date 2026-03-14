import { useLocation, useNavigate } from "react-router-dom";
import { Home, User, Moon, Settings, Clock } from "lucide-react";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/history", icon: Clock, label: "History" },
  { path: "/profile", icon: User, label: "Profile" },
  { path: "/debrief", icon: Moon, label: "Debrief" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide tab bar during SOS mode
  if (location.pathname === "/sos") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2 pb-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-body font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
