import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchApi } from '@/lib/api';
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
import { Minus, Plus, ShoppingCart, Trash2, Edit, Loader2, FlaskConical, ChevronDown } from 'lucide-react';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { DrinkCustomizationDialog } from "@/components/DrinkCustomizationDialog";
import { useCart } from "@/hooks/useCart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { LanguageToggle } from "@/components/LanguageToggle";

import type { MenuItem, CartItem, DrinkCustomization } from "@project3/shared";
import { TAX_RATE } from "@project3/shared";


const categories = [
  'All Items',
  'Milk Tea',
  'Matcha',
  'Fruit Tea',
  'Slush',
  'Seasonal',
];

function Kiosk() {
  const { t: translate } = useTranslation();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { cart, addToCart, removeFromCart, updateQuantity, updateCartItem, checkout, isSubmitting } = useCart();
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buttonPulse, setButtonPulse] = useState(false);
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);
  const [experimentalMode, setExperimentalMode] = useState(false);
  const [customizationDialog, setCustomizationDialog] = useState<{
      open: boolean;
      item: MenuItem | null;
      editingCartItem: CartItem | null;
    }>({
      open: false,
      item: null,
      editingCartItem: null,
    });

  useEffect(() => {
    // 1. Menu Fetch
    fetchApi<MenuItem[]>('/api/menu')
      .then((data) => {
        const menuWithNumbers = data.map((item) => ({
          ...item,
          cost: parseFloat(String(item.cost)),
        }));
        setMenu(menuWithNumbers);
      })
      .catch(() => setMenu([]));

    // 2. Weather Fetch
    fetchApi<{ temperature: number; icon: string }>('/api/weather/current')
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
      updateCartItem(customizationDialog.editingCartItem.uniqueId, { customization });
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
      addToCart(newCartItem);

      // Trigger button pulse animation
      setButtonPulse(true);
      setTimeout(() => setButtonPulse(false), 500);
    }

    setCustomizationDialog({ open: false, item: null, editingCartItem: null });
  };

  const total = cart.reduce((sum, item: CartItem) => sum + (item.cost * item.quantity), 0);
  const tax = total * TAX_RATE;
  const finalTotal = total + tax;

  const handleCheckout = () => {
    checkout(() => {
      setDrawerOpen(false);
    });
  };

  return (
    <div className={`flex h-screen bg-background ${experimentalMode ? 'cursor-none' : ''}`}>
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
        {weather && (
          <div className="px-2 py-2">
            <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />
          </div>
        )}

        {/* Language Toggle */}
        <div className="px-2 py-2">
          <LanguageToggle />
        </div>

        {/* Experimental Mode Toggle */}
        <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="text-sm">{translate('kiosk.experimental')}</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 py-3">
              <div className="flex items-center justify-between">
                <label htmlFor="smooth-cursor" className="text-sm text-muted-foreground">
                  {translate('kiosk.smoothCursor')}
                </label>
                <Switch
                  id="smooth-cursor"
                  checked={experimentalMode}
                  onCheckedChange={setExperimentalMode}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Main content area with product cards */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-6">
              {menu
                .filter((item) => activeCategory === 'All Items' || item.category === activeCategory)
                .map(item => (
                <Card
                  key={item.item_id}
                  className="cursor-pointer transition-all duration-150 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md h-72"
                  onClick={() => openCustomizationDialog(item)}
                  role="button"
                  tabIndex={0}
                  aria-label={translate('aria.addToCart', { item: item.item_name })}
                  onKeyDown={(e) => e.key === 'Enter' && openCustomizationDialog(item)}
                >
                  <CardHeader className="p-4 pb-1">
                    <CardTitle className="text-lg text-center line-clamp-2 min-h-[3rem]">
                      {item.item_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 flex flex-col items-center justify-between h-[calc(100%-5rem)]">
                    <img
                      src="/brownsugarboba.jpg"
                      alt={item.item_name}
                      className="w-36 h-36 object-cover rounded-lg shadow-md"
                    />
                    <div className="text-2xl font-bold text-primary mt-2">
                      ${item.cost.toFixed(2)}
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
                aria-label={translate('aria.cartButton', { count: cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) })}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {translate('common.checkout')}
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>

            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>{translate('kiosk.yourOrder')}</DrawerTitle>
                <DrawerDescription>
                  {translate('kiosk.reviewItems')}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex gap-8 px-10 pb-8">
                {/* Left side - Cart items */}
                <div className="flex-1 overflow-auto max-h-[50vh] pr-4">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
                      <p>{translate('kiosk.cartEmpty')}</p>
                      <p className="text-sm mt-1">{translate('kiosk.addItemsToStart')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item: CartItem) => (
                        <div key={item.uniqueId} className="border rounded-lg p-3">
                          <div className="flex gap-3 mb-2">
                            <img
                              src="/brownsugarboba.jpg"
                              alt={item.item_name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex items-start justify-between flex-1">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{item.item_name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  ${item.cost.toFixed(2)} {translate('common.each')}
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
                                        {item.customization.sweetness}% {translate('common.sweet')}
                                      </Badge>
                                    )}
                                    {/* Ice - only show if not default (regular) */}
                                    {item.customization.ice !== 'regular' && (
                                      <Badge variant="secondary" className="text-xs capitalize">
                                        {item.customization.ice} {translate('common.ice')}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => openEditDialog(item)}
                                  aria-label={translate('aria.editItem', { item: item.item_name })}
                                >
                                  <Edit className="h-3 w-3" aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeFromCart(item.uniqueId)}
                                  aria-label={translate('aria.removeFromCart', { item: item.item_name })}
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}
                                aria-label={translate('aria.decreaseQuantity', { item: item.item_name })}
                              >
                                <Minus className="h-3 w-3" aria-hidden="true" />
                              </Button>
                              <span className="w-10 text-center text-sm font-medium" aria-live="polite">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}
                                aria-label={translate('aria.increaseQuantity', { item: item.item_name })}
                              >
                                <Plus className="h-3 w-3" aria-hidden="true" />
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
                        <div className="text-6xl font-bold" aria-live="polite">
                          ${finalTotal.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-3 space-y-1">
                          <div>{translate('common.subtotal')}: ${total.toFixed(2)}</div>
                          <div>{translate('common.tax')}: (${tax.toFixed(2)})</div>
                        </div>
                      </div>
                      <Button size="lg" className="w-full h-16 text-xl" onClick={handleCheckout} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" aria-label="Processing" /> : translate('common.payNow')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
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

      {/* Smooth Cursor - only when experimental mode is enabled */}
      {experimentalMode && <SmoothCursor />}
    </div>
  );
}

export default Kiosk;