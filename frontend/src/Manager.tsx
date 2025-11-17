import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Package, Users, History, LogOut, ShoppingCart } from "lucide-react"; //icons
import { useAuth } from "@/contexts/AuthContext";
import { WeatherDisplay } from "@/components/WeatherDisplay";
import MenuPage from "./MenuPage";
import EmployeesPage from "./EmployeesPage";
import InventoryPage from "./InventoryPage";
import HistoryPage from "./HistoryPage";

const categories = [
  "Dashboard",
  "Menu Items",
  "Inventory",
  "Employees",
  "Order History",
];

const InventoryContent = () => <InventoryPage />;

const EmployeesContent = () => <EmployeesPage />;

const HistoryContent = () => <HistoryPage />;

const MenuContent = () => <MenuPage />;

const DashboardContent = () => (
  <div className="flex h-screen bg-background">
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/*inventory */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Inventory
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">67 items</div>
              <p className="text-xs text-muted-foreground">placeholder info</p>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="p-0">
                View Details
              </Button>
            </CardFooter>
          </Card>

          {/*employees info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">placeholder info</p>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="p-0">
                Manage Staff
              </Button>
            </CardFooter>
          </Card>

          {/* order hist card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Activity
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15 logs</div>
              <p className="text-xs text-muted-foreground">placeholder info</p>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="p-0">
                Review History
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/*put charts here*/}
      <section className="mb-8">
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Charts here</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">big performative table</div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  </div>
);

function Manager() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Dashboard");
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/weather/current`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(() => setWeather(null));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "Dashboard":
        return <DashboardContent />;
      case "Inventory":
        return <InventoryContent />;
      case "Employees":
        return <EmployeesContent />;
      case "Order History":
        return <HistoryContent />;
      case "Menu Items":
        return <MenuContent />;
      default:
        return <DashboardContent />;
    }
  };

  // const categoryIcons = {
  //     'Dashboard': <LayoutDashboard className="h-4 w-4 mr-2" />,
  //     'Menu Items': <SquareMenu className="h-4 w-4 mr-2" />,
  //     'Inventory': <Package className="h-4 w-4 mr-2" />,
  //     'Employees': <Users className="h-4 w-4 mr-2" />,
  //     'Order History': <History className="h-4 w-4 mr-2" />,
  // };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-gray-100 dark:bg-gray-900 border-r p-4 flex flex-col gap-2">
        <h2 className="text-lg font-semibold mb-2 text-foreground">
          Management
        </h2>
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        ))}

        {/* Spacer to push logout button to bottom */}
        <div className="flex-1" />

        {/* User info and logout button */}
        <div className="border-t pt-4 mt-2 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}
          {weather && (
            <div className="px-2 py-2">
              <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/cashier')}
          >
            <ShoppingCart className="h-4 w-4" />
            Cashier
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">{renderContent()}</div>
    </div>
  );
}

export default Manager;
