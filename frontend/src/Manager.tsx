import { useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Package,
  Users,
  History,
  LogOut,
  LayoutDashboard,
  SquareMenu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WeatherDisplay } from "@/components/WeatherDisplay";
import { ModeToggle } from "@/components/ModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

// --- IMPORT YOUR PAGES ---
import MenuPage from "./MenuPage";
import EmployeesPage from "./EmployeesPage";
import InventoryPage from "./InventoryPage";
import HistoryPage from "./HistoryPage";
import DashboardPage from "./DashboardPage"; // <--- NEW IMPORT

type Category =
  | "Dashboard"
  | "Inventory"
  | "Employees"
  | "History"
  | "Menu Items";
const categories: Category[] = [
  "Dashboard",
  "Inventory",
  "Employees",
  "History",
  "Menu Items",
];

const categoryTranslationKeys: Record<Category, string> = {
  Dashboard: "manager.categories.dashboard",
  Inventory: "manager.categories.inventory",
  Employees: "manager.categories.employees",
  History: "manager.categories.history",
  "Menu Items": "manager.categories.menuItems",
};

function Manager() {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<Category>(
    (searchParams.get("tab") as Category) || "Dashboard"
  );
  const { logout, user } = useAuth();
  const [weather, setWeather] = useState<{
    temperature: number;
    icon: string;
  } | null>(null);

  useEffect(() => {
    fetchApi<{ temperature: number; icon: string }>(`/api/weather/current`)
      .then((data) => setWeather(data))
      .catch(() => setWeather(null));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    setSearchParams({ tab: category });
  };

  // --- RENDER CONTENT SWITCHER ---
  const renderContent = (currentCategory: Category): ReactNode => {
    switch (currentCategory) {
      case "Dashboard":
        return <DashboardPage />; // <--- Use the new page here
      case "Inventory":
        return <InventoryPage />;
      case "Employees":
        return <EmployeesPage />;
      case "History":
        return <HistoryPage />;
      case "Menu Items":
        return <MenuPage />;
      default:
        return <DashboardPage />;
    }
  };

  const categoryIcons = {
    Dashboard: <LayoutDashboard className="h-4 w-4 mr-2" />,
    "Menu Items": <SquareMenu className="h-4 w-4 mr-2" />,
    Inventory: <Package className="h-4 w-4 mr-2" />,
    Employees: <Users className="h-4 w-4 mr-2" />,
    History: <History className="h-4 w-4 mr-2" />,
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 dark:bg-gray-900 border-r p-4 flex flex-col gap-2 shrink-0">
        {/* BobaPOS Header */}
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-8 w-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            🧋
          </div>
          <h1 className="text-xl font-bold text-brand-900">BobaPOS</h1>
        </div>

        <div className="mb-4 space-y-2">
          <ModeToggle currentMode="manager" />
          <LanguageToggle />
        </div>

        <h2 className="text-lg font-semibold mb-2 text-foreground">
          {translate("manager.management")}
        </h2>
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "ghost"}
            className={`
              w-full justify-start text-left transition-colors duration-200
              ${
                activeCategory === category
                  ? "bg-gray-300 dark:bg-gray-800 font-semibold border-l-4 border-brand-500 shadow-sm text-foreground hover:bg-gray-300/90 dark:hover:bg-gray-800/80"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-foreground"
              }
            `}
            onClick={() => handleCategoryChange(category)}
          >
            {categoryIcons[category as keyof typeof categoryIcons]}
            {translate(categoryTranslationKeys[category])}
          </Button>
        ))}

        <div className="flex-1" />

        <div className="border-t pt-4 mt-2 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
            </div>
          )}
          {weather && (
            <div className="px-2 py-2">
              <WeatherDisplay
                temperature={weather.temperature}
                icon={weather.icon}
              />
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {translate("common.logout")}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {renderContent(activeCategory)}
      </div>
    </div>
  );
}

export default Manager;
