import { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import type { MenuItem } from "@project3/shared";
import { TAX_RATE } from "@project3/shared";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WeatherDisplay } from "@/components/WeatherDisplay";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Minus, Plus, ShoppingCart, Trash2, LogOut, Settings, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DrinkCustomizationDialog } from "@/components/DrinkCustomizationDialog";

interface DrinkCustomization {
  sweetness: 100 | 50 | 25;
  ice: 'regular' | 'light' | 'none';
  size: 'small' | 'medium' | 'large';
}

interface CartItem {
  item_id: number;
  item_name: string;
  cost: number;
  quantity: number;
  customization?: DrinkCustomization;
  uniqueId: string; // handle multiple instances of same item w/ different customizations
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
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);
  const [customizationDialog, setCustomizationDialog] = useState<{
    open: boolean;
    item: MenuItem | null;
    editingCartItem: CartItem | null;
  }>({
    open: false,
    item: null,
    editingCartItem: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: prevent double submissions
  // Synchronous lock to prevent double-processing before React re-renders
  const processingRef = useRef(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    // 1. Menu Fetch - use fetchApi which unwraps { success, data }
    fetchApi<MenuItem[]>('/api/menu')
      .then((data) => {
        const menuWithNumbers = data.map((item) => ({
          ...item,
          cost: parseFloat(String(item.cost)), // Ensure number
        }));
        setMenu(menuWithNumbers);
      })
      .catch(() => setMenu([]));

    // FIX: Use fetchApi<Type> to automatically unwrap API responses
    fetchApi<{ temperature: number; icon: string }>(`/api/weather/current`)
      .then((data) => setWeather(data))
      .catch(() => setWeather(null));
  }, []);

  const openCustomizationDialog = (item: MenuItem) => {
    setCustomizationDialog({
      open: true,
      item,
      editingCartItem: null,
    });
  };

  const openEditDialog = (cartItem: CartItem) => {
    const menuItem = menu.find((m) => m.item_id === cartItem.item_id);
    if (menuItem) {
      setCustomizationDialog({
        open: true,
        item: menuItem,
        editingCartItem: cartItem,
      });
    }
  };

  const handleCustomizationConfirm = (customization: DrinkCustomization) => {
    if (!customizationDialog.item) return;

    if (customizationDialog.editingCartItem) {
      // Editing existing cart item
      setCart(
        cart.map((c) =>
          c.uniqueId === customizationDialog.editingCartItem!.uniqueId
            ? { ...c, customization }
            : c
        )
      );
    } else {
      // Adding new item to cart
      const newCartItem: CartItem = {
        item_id: customizationDialog.item.item_id,
        item_name: customizationDialog.item.item_name,
        cost: customizationDialog.item.cost,
        quantity: 1,
        customization,
        uniqueId: `${customizationDialog.item.item_id}-${Date.now()}-${Math.random()}`,
      };
      setCart([...cart, newCartItem]);
    }

    setCustomizationDialog({ open: false, item: null, editingCartItem: null });
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(cart.filter((c) => c.uniqueId !== uniqueId));
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(uniqueId);
    } else {
      setCart(cart.map((c) => (c.uniqueId === uniqueId ? { ...c, quantity } : c)));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  const handleCheckout = async () => {
    // Use a ref for an immediate, synchronous lock to stop rapid double-clicks
    if (processingRef.current) return;
    processingRef.current = true;
    setIsSubmitting(true);

    try {
      // Define the async checkout action and execute it immediately to obtain the Promise
      const checkoutPromise = (async () => {
        const orderData = {
          items: cart.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            cost: item.cost
          }))
        };

        // 3. Order History Fetch - use fetchApi to unwrap response
        await fetchApi('/api/order-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        setCart([]);
        return { success: true };
      })();

      // Attach toast to the actual promise (do not await toast.promise itself)
      toast.promise(checkoutPromise, {
        loading: "Adding order...",
        success: "Order created",
        error: "Error creating order",
      });

      // Await the underlying promise so the lock stays engaged until completion
      await checkoutPromise;
    } catch (error) {
      console.error(error);
    } finally {
      // Reset both the synchronous lock and visual submitting state
      processingRef.current = false;
      setIsSubmitting(false); // Re-enable button
    }
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
              {weather && <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />}
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
                onClick={() => openCustomizationDialog(item)}
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
              <Card key={item.uniqueId}>
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
                        {item.customization && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {/* Size - always show, display as single letter uppercase */}
                            <Badge variant="secondary" className="text-xs uppercase">
                              {item.customization.size.charAt(0)}
                            </Badge>
                            {/* Sweetness - only show if not default (100) */}
                            {item.customization.sweetness !== 100 && (
                              <Badge variant="secondary" className="text-xs">
                                {item.customization.sweetness}% Sweet
                              </Badge>
                            )}
                            {/* Ice - only show if not default (regular) */}
                            {item.customization.ice !== 'regular' && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {item.customization.ice} ice
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.uniqueId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.uniqueId, item.quantity - 1)
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
                            updateQuantity(item.uniqueId, item.quantity + 1)
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
                <span className="text-muted-foreground">Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                <span className="font-medium">{(total * TAX_RATE).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(total * (1 + TAX_RATE)).toFixed(2)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full text-lg h-12" onClick={handleCheckout} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Checkout"}
            </Button>
          </div>
        )}
      </div>

      {/* Customization Dialog */}
      <DrinkCustomizationDialog
        open={customizationDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCustomizationDialog({ open: false, item: null, editingCartItem: null });
          }
        }}
        itemName={customizationDialog.item?.item_name || ""}
        defaultCustomization={customizationDialog.editingCartItem?.customization}
        onConfirm={handleCustomizationConfirm}
      />
    </div>
  );
}

export default Cashier;
