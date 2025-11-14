import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  item_id: number;
  item_name: string;
  cost: number;
}

interface CartItem {
  item_id: number;
  item_name: string;
  cost: number;
  quantity: number;
}

const categories = [
  'All Items',
  'Coffee',
  'Smoothie',
  'Specials',
];

function Kiosk() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buttonPulse, setButtonPulse] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/menu`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const menuWithNumbers = data.map(item => ({
            ...item,
            cost: parseFloat(item.cost)
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
    const existing = cart.find(c => c.item_id === item.item_id);
    if (existing) {
      setCart(cart.map(c =>
        c.item_id === item.item_id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }

    // Trigger pulse animation
    setButtonPulse(true);
    setTimeout(() => setButtonPulse(false), 500);
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.item_id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c =>
        c.item_id === itemId ? { ...c, quantity } : c
      ));
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const tax = total * 0.0825;
  const finalTotal = total + tax;

  const handleCheckout = () => {
    toast.promise(
      async () => {
        const orderData = {
          items: cart.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            cost: item.cost
          }))
        };

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

        setCart([]);
        setDrawerOpen(false);
        return { success: true };
      },
      {
        loading: "Processing payment...",
        success: "Order complete!",
        error: "Payment failed",
      }
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with categories */}
      <div className="w-64 bg-gray-100 dark:bg-gray-900 border-r p-4 flex flex-col gap-2">
        {categories.map((category, index) => (
          <Button
            key={index}
            variant={activeCategory === category ? "default" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Main content area with product cards */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 overflow-auto p-8 pt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {menu.map(item => (
                <Card
                  key={item.item_id}
                  className="cursor-pointer transition-all duration-150 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md h-40"
                  onClick={() => addToCart(item)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base text-center line-clamp-2">
                      {item.item_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex flex-col items-center justify-center">
                      <img
                        src="/bobaicon.jpg"
                        alt="Boba drink"
                        className="w-12 h-12 object-cover rounded-full mb-2"
                      />
                      <span className="text-xl font-bold">
                        ${item.cost.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Drawer Trigger */}
        <div className="p-4">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                size="lg"
                className={`w-64 mx-auto flex items-center gap-2 transition-transform duration-500 ${
                  buttonPulse ? 'scale-110' : 'scale-100'
                }`}
                variant={cart.length > 0 ? "default" : "outline"}
              >
                <ShoppingCart className="h-5 w-5" />
                Checkout
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>

            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>Your Order</DrawerTitle>
                <DrawerDescription>
                  Review your items and proceed to payment
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex gap-8 px-10 pb-8">
                {/* Left side - Cart items */}
                <div className="flex-1 overflow-auto max-h-[50vh] pr-4">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Your cart is empty</p>
                      <p className="text-sm mt-1">Add items to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.item_id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{item.item_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                ${item.cost.toFixed(2)} each
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeFromCart(item.item_id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-10 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-semibold">
                              ${(item.cost * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side - Payment section */}
                {cart.length > 0 && (
                  <div className="w-[450px] flex flex-col justify-end pl-4">
                    <div className="space-y-5">
                      <div className="text-center">
                        <div className="text-6xl font-bold">
                          ${finalTotal.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-3 space-y-1">
                          <div>Subtotal: ${total.toFixed(2)}</div>
                          <div>Tax: (${tax.toFixed(2)})</div>
                        </div>
                      </div>
                      <Button size="lg" className="w-full h-16 text-xl" onClick={handleCheckout}>
                        Pay Now
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
}

export default Kiosk;