import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Minus, Plus, ShoppingCart, Trash2, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MenuItem {
  item_id: number;
  item_name: string;
  cost: number;
  category: string;
}

interface CartItem {
  item_id: number;
  item_name: string;
  cost: number;
  quantity: number;
}

const categories = [
  "All Items",
  "Milk Tea",
  "Matcha",
  "Fruit Tea",
  "Slush",
  "Seasonal",
];

function Cashier() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All Items");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    fetch(`${API_URL}/api/menu`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const menuWithNumbers = data.map((item) => ({
            ...item,
            cost: parseFloat(item.cost),
          }));
          setMenu(menuWithNumbers);
        } else {
          setMenu([]);
        }
      })
      .catch(() => {
        setMenu([]);
      });
  }, []);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.item_id === item.item_id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter((c) => c.item_id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map((c) => (c.item_id === itemId ? { ...c, quantity } : c)));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  const handleCheckout = () => {
    toast.promise(
      async () => {
        // Prepare order data
        const orderData = {
          items: cart.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            cost: item.cost
          }))
        };

        // Call the API
        const response = await fetch(`${API_URL}/api/order-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error('Failed to create order');
        }

        // Clear cart on success
        setCart([]);
        return { success: true };
      },
      {
        loading: "Adding order...",
        success: "Order created",
        error: "Error creating order",
      }
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content - Menu Items */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b">
          <div className="flex h-16 items-center px-6 justify-between">
            <h1 className="text-2xl font-bold">Cashier</h1>
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/manager')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Category Tabs (non-functional) */}
        <div className="border-b bg-background px-6">
          <div className="flex h-12 items-center space-x-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all hover:text-primary ${
                  activeCategory === category
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {menu
              .filter((item) => activeCategory === "All Items" || item.category === activeCategory)
              .map((item) => (
              <Card
                key={item.item_id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={() => addToCart(item)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-lg line-clamp-2">
                    {item.item_name}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <span className="text-2xl font-bold text-primary">
                    ${item.cost.toFixed(2)}
                  </span>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-96 border-l bg-muted/10 flex flex-col">
        {/* Cart Header */}
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Current Order</h2>
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Badge>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Cart is empty</p>
              <p className="text-sm">Add items from the menu to get started</p>
            </div>
          ) : (
            cart.map((item) => (
              <Card key={item.item_id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium leading-tight">
                          {item.item_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          ${item.cost.toFixed(2)} each
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.item_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.item_id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.item_id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ${(item.cost * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        {cart.length > 0 && (
          <div className="border-t p-6 space-y-4 bg-background">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8.25%)</span>
                <span className="font-medium">
                  ${(total * 0.0825).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(total * 1.0825).toFixed(2)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full text-lg h-12" onClick={handleCheckout}>
              Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cashier;
