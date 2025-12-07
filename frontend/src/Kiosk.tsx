import { useState, useEffect, useRef } from 'react';
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
  DrawerTitle
} from '@/components/ui/drawer';
import { 
  Minus, Plus, ShoppingCart, Trash2, Edit, Loader2, FlaskConical, ChevronDown, 
  CreditCard, Banknote, LogIn, User, Star, LogOut, CheckCircle, History, Eye
} from 'lucide-react';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { DrinkCustomizationDialog } from "@/components/DrinkCustomizationDialog";
import { useCart } from "@/hooks/useCart";
import { useCustomer } from "@/contexts/CustomerContext";
import { MemberLoginDialog } from "@/components/MemberLoginDialog";
import { PastOrdersDialog } from "@/components/PastOrdersDialog";
import { useAudio } from "@/hooks/useAudio"; 
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";

import type { MenuItem, CartItem, DrinkCustomization } from "@project3/shared";
import { TAX_RATE } from "@project3/shared";

// --- Types ---
interface SuccessData {
  orderId: number;
  pointsEarned: number;
  customerName?: string;
}

const categories = [
  'All Items',
  'Milk Tea',
  'Matcha',
  'Fruit Tea',
  'Slush',
  'Seasonal',
];

const categoryTranslationKeys: Record<string, string> = {
  "All Items": "categories.allItems",
  "Milk Tea": "categories.milkTea",
  "Matcha": "categories.matcha",
  "Fruit Tea": "categories.fruitTea",
  "Slush": "categories.slush",
  "Seasonal": "categories.seasonal",
};

// FIX: Define options outside component to prevent re-creation on re-renders
const CONFETTI_GLOBAL_OPTIONS = { resize: true, useWorker: true };

export default function Kiosk() {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const confettiRef = useRef<ConfettiRef>(null);
  
  // -- AUDIO / TTS LOGIC --
  const { play } = useAudio();
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // -- CUSTOMER LOGIC --
  const { customer, logoutCustomer } = useCustomer();
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestDialog, setGuestDialog] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [memberBtnFlash, setMemberBtnFlash] = useState(false);
  
  // -- SUCCESS SCREEN STATE --
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  // ------------------------

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { cart, addToCart, removeFromCart, updateQuantity, updateCartItem, checkout, isSubmitting } = useCart();
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buttonPulse, setButtonPulse] = useState(false);
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);
  
  // -- EXPERIMENTAL MODES --
  const [experimentalMode, setExperimentalMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  
  const [customizationDialog, setCustomizationDialog] = useState<{
      open: boolean;
      item: MenuItem | null;
      editingCartItem: CartItem | null;
    }>({
      open: false,
      item: null,
      editingCartItem: null,
    });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');

  useEffect(() => {
    fetchApi<MenuItem[]>('/api/menu')
      .then((data) => {
        const menuWithNumbers = data.map((item) => ({
          ...item,
          cost: parseFloat(String(item.cost)),
        }));
        setMenu(menuWithNumbers);
      })
      .catch(() => setMenu([]));

    fetchApi<{ temperature: number; icon: string }>('/api/weather/current')
      .then((data) => setWeather(data))
      .catch(() => setWeather(null));
  }, []);

  // --- MEMBER BUTTON FLASH EFFECT ---
  useEffect(() => {
    if (customer) return;

    const interval = setInterval(() => {
      setMemberBtnFlash(true);
      setTimeout(() => setMemberBtnFlash(false), 500);
    }, 1000);

    return () => clearInterval(interval);
  }, [customer]);

  // --- CONFETTI EFFECT ---
  useEffect(() => {
    if (successData) {
      const timer = setTimeout(() => {
        const defaults = { startVelocity: 60, spread: 70, ticks: 120, zIndex: 200 };
        const particleCount = 80;

        confettiRef.current?.fire({ ...defaults, particleCount, origin: { x: 0, y: 0 }, angle: -45 });

        setTimeout(() => {
          confettiRef.current?.fire({ ...defaults, particleCount, origin: { x: 1, y: 0 }, angle: 225 });
        }, 150);

        setTimeout(() => {
          confettiRef.current?.fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 45 });
        }, 300);

        setTimeout(() => {
          confettiRef.current?.fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 135 });
        }, 450);

      }, 300);

      return () => clearTimeout(timer);
    }
  }, [successData]);

  const openCustomizationDialog = (item: MenuItem) => {
    if (ttsEnabled) play('options');
    setCustomizationDialog({ open: true, item, editingCartItem: null });
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
      updateCartItem(customizationDialog.editingCartItem.uniqueId, { customization });
    } else {
      const newCartItem: CartItem = {
        item_id: customizationDialog.item.item_id,
        item_name: customizationDialog.item.item_name,
        cost: customizationDialog.item.cost,
        quantity: 1,
        customization,
        uniqueId: `${customizationDialog.item.item_id}-${Date.now()}-${Math.random()}`,
      };
      addToCart(newCartItem);
      if (ttsEnabled) play('drink');

      setButtonPulse(true);
      setTimeout(() => setButtonPulse(false), 500);
    }
    setCustomizationDialog({ open: false, item: null, editingCartItem: null });
  };

  // --- REORDER HANDLER ---
  const handleReorder = (items: CartItem[]) => {
    items.forEach(item => addToCart(item));
    if (ttsEnabled) play('drink');
    // Delay drawer opening to prevent animation glitches
    setTimeout(() => {
      setDrawerOpen(true);
    }, 200);
  };

  // --- CALCULATION LOGIC ---
  const total = cart.reduce((sum, item: CartItem) => sum + (item.cost * item.quantity), 0);
  
  const POINTS_PER_DOLLAR = 100;
  const maxDiscount = customer ? Math.floor(customer.points / POINTS_PER_DOLLAR) : 0;
  const discountAmount = usePoints ? Math.min(maxDiscount, total) : 0;
  const pointsToBurn = discountAmount * POINTS_PER_DOLLAR;

  const taxableAmount = Math.max(0, total - discountAmount);
  const tax = taxableAmount * TAX_RATE;
  const finalTotal = taxableAmount + tax;

  const estimatedPointsEarned = Math.floor(total * 10);

  const handleCheckout = () => {
    const wasCustomer = !!customer;
    const name = customer?.customer_name;

    checkout(
      paymentMethod, 
      (orderId) => {
        if (ttsEnabled) play('confirmed');
        setDrawerOpen(false);
        setUsePoints(false);
        setSuccessData({
          orderId,
          pointsEarned: wasCustomer ? estimatedPointsEarned : 0,
          customerName: name
        });
        if(wasCustomer) logoutCustomer(); 
      },
      customer?.customers_id,
      pointsToBurn,
      discountAmount
    );
  };

  const handleMainCheckoutClick = () => {
    if (!customer) {
      setGuestDialog(true);
    } else {
      setDrawerOpen(true);
    }
  };

  return (
    <div className={`flex h-screen bg-background ${experimentalMode ? 'cursor-none' : ''}`}>
      
      {/* High Contrast Style Injection */}
      {highContrast && (
        <style>{`
          /* Force higher contrast for common text classes */
          .text-muted-foreground { color: #0f172a !important; }
          .text-gray-400, .text-gray-500, .text-gray-600 { color: #000000 !important; font-weight: 500 !important; }
          .bg-muted { background-color: #f1f5f9 !important; border: 1px solid #94a3b8; }
          .border { border-color: #000000 !important; }
          /* Ensure icons are visible */
          .lucide { color: #000000 !important; }
        `}</style>
      )}

      {/* GLOBAL CONFETTI CANVAS */}
      <Confetti 
        ref={confettiRef} 
        manualstart={true}
        globalOptions={CONFETTI_GLOBAL_OPTIONS} // FIX: Pass stable options
        className="fixed inset-0 z-[200] w-screen h-screen pointer-events-none" 
      />

      {/* Sidebar */}
      <nav className="w-72 bg-gray-100 dark:bg-gray-900 border-r p-4 flex flex-col gap-2" aria-label="Main Navigation">
        
        {/* MEMBER LOGIN BUTTON */}
        <div className="px-2 pb-2">
          {customer ? (
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className='overflow-hidden'>
                      <h3 className="font-bold text-sm truncate w-40">{customer.customer_name}</h3>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                        <Star className="h-3 w-3 fill-current" />
                        {customer.points} pts
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1 px-1" 
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History className="h-4 w-4" /> History
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs gap-1 px-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      onClick={logoutCustomer}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button 
              variant="outline"
              className={`w-full justify-start gap-2 border-2 border-dashed transition-all duration-300
                ${memberBtnFlash 
                  ? "border-gray-900 text-gray-900 bg-gray-100/50 scale-[1.02]" 
                  : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-transparent" 
                }
              `}
              onClick={() => setLoginOpen(true)}
            >
              <User className="h-5 w-5" />
              Member Login
            </Button>
          )}
        </div>

        {categories.map((category, index) => (
          <Button
            key={index}
            variant={activeCategory === category ? "default" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveCategory(category)}
          >
            {translate(categoryTranslationKeys[category])}
          </Button>
        ))}
        {weather && (
          <div className="px-2 py-2">
            <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />
          </div>
        )}

        <div className="px-2 py-2">
          <LanguageToggle />
        </div>

        <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  <span className="text-sm">{translate('kiosk.experimental')}</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 py-3 space-y-3">
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
              <div className="flex items-center justify-between">
                <label htmlFor="tts-toggle" className="text-sm text-muted-foreground">
                  {translate('kiosk.tts')}
                </label>
                <Switch
                  id="tts-toggle"
                  checked={ttsEnabled}
                  onCheckedChange={(checked) => {
                    setTtsEnabled(checked);
                    if (checked) play('intro');
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="high-contrast" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  High Contrast
                </label>
                <Switch
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            variant="ghost"
            className="w-full justify-start text-left"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            {translate('common.login')}
          </Button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <h1 className="sr-only">Boba Tea Kiosk Menu and Ordering</h1>
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
                      src={item.image_url || "/brownsugarboba.jpg"}
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

        {/* Drawer Trigger */}
        <div className="p-4">
          <Button
            size="lg"
            className={`w-64 mx-auto flex items-center gap-2 transition-transform duration-500 ${
              buttonPulse ? 'scale-110' : 'scale-100'
            }`}
            variant={cart.length > 0 ? "default" : "outline"}
            onClick={handleMainCheckoutClick}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {translate('common.checkout')}
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </main>

      {/* CHECKOUT DRAWER */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="flex-none">
            <DrawerTitle>{translate('kiosk.yourOrder')}</DrawerTitle>
            <DrawerDescription>{translate('kiosk.reviewItems')}</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 flex gap-8 px-10 pb-8 min-h-0">
            {/* Left: Cart Items */}
            <div className="flex-1 overflow-y-auto pr-4">
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
                            src={menu.find(m => m.item_id === item.item_id)?.image_url || "/brownsugarboba.jpg"} 
                            alt={item.item_name}
                            className="w-16 h-16 rounded object-cover flex-shrink-0" 
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h4 className="font-medium text-sm">{item.item_name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    ${item.cost.toFixed(2)} {translate('common.each')}
                                  </p>
                               </div>
                               <span className="font-bold">${(item.cost * item.quantity).toFixed(2)}</span>
                            </div>
                            
                            {item.customization && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs uppercase">
                                  {item.customization.size.charAt(0)}
                                </Badge>
                                {item.customization.sweetness !== 100 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.customization.sweetness}% {translate('common.sweet')}
                                  </Badge>
                                )}
                                {item.customization.ice !== 'regular' && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {item.customization.ice} {translate('common.ice')}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                           <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                           </div>
                           
                           <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.uniqueId)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Right: Payment & Points */}
            <div className="w-[400px] flex-none flex flex-col justify-end pl-4">
              <div className="space-y-4">
                
                {customer && customer.points >= 100 && (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500 fill-current" />
                            <span className="font-semibold text-amber-900">Use Points?</span>
                        </div>
                        <Switch 
                            checked={usePoints} 
                            onCheckedChange={setUsePoints}
                            className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="text-sm text-amber-800">
                        Balance: <strong>{customer.points}</strong> pts.
                        {usePoints ? (
                            <div className="mt-1 font-bold text-green-600">
                              Saving ${discountAmount.toFixed(2)} (-{pointsToBurn} pts)
                            </div>
                        ) : (
                            <div className="mt-1">
                              Max discount: <strong>${maxDiscount.toFixed(2)}</strong>
                            </div>
                        )}
                      </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-6xl font-bold">${finalTotal.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>${total.toFixed(2)}</span></div>
                    {usePoints && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Points Discount:</span> <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between"><span>Tax:</span> <span>${tax.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} className="flex-1 h-12" onClick={() => setPaymentMethod('card')}>
                    <CreditCard className="mr-2 h-4 w-4" /> Card
                  </Button>
                  <Button 
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                    className="flex-1 h-12" 
                    onClick={() => {
                      setPaymentMethod('cash');
                      if (ttsEnabled) play('cash');
                    }}
                  >
                    <Banknote className="mr-2 h-4 w-4" /> Cash
                  </Button>
                </div>

                <Button size="lg" className="w-full h-14 text-xl" onClick={handleCheckout} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Pay Now"}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* GUEST CHECKOUT INTERCEPTION DIALOG */}
      <Dialog open={guestDialog} onOpenChange={setGuestDialog}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-center text-2xl">Earn Free Drinks? 🥤</DialogTitle>
               <DialogDescription className="text-center text-base">
                  Join our rewards program now to earn <strong>50 points</strong> instantly on this order!
               </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-4">
               <Button 
                  size="lg" 
                  className="w-full text-lg h-12 font-semibold" 
                  onClick={() => { setGuestDialog(false); setLoginOpen(true); }}
               >
                  Yes! Sign me up
               </Button>
               <Button 
                  variant="ghost" 
                  className="text-muted-foreground" 
                  onClick={() => { setGuestDialog(false); setDrawerOpen(true); }}
               >
                  No thanks, continue as guest
               </Button>
            </div>
         </DialogContent>
      </Dialog>

      <MemberLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      
      <PastOrdersDialog 
        open={historyOpen} 
        onOpenChange={setHistoryOpen} 
        customerId={customer?.customers_id || 0} 
        onReorder={handleReorder}
      />
      
      <DrinkCustomizationDialog
        open={customizationDialog.open}
        onOpenChange={(open) => !open && setCustomizationDialog(prev => ({ ...prev, open: false }))}
        itemName={customizationDialog.item?.item_name || ""}
        defaultCustomization={customizationDialog.editingCartItem?.customization}
        onConfirm={handleCustomizationConfirm}
      />

      {/* SUCCESS DIALOG */}
      <SuccessDialog 
        data={successData} 
        open={!!successData} 
        onOpenChange={(open) => {
          if (!open) setSuccessData(null);
        }} 
      />

      {experimentalMode && <SmoothCursor />}
    </div>
  );
}

// --- Success Dialog Component ---
function SuccessDialog({ data, open, onOpenChange }: { data: SuccessData | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  // UseRef for callback stability
  const closeRef = useRef(onOpenChange);
  useEffect(() => { closeRef.current = onOpenChange; }, [onOpenChange]);

  // COUNTDOWN STATE
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (open) {
      setCountdown(15);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            closeRef.current(false); // Use ref to prevent dependency loop
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [open]);

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center pt-12 pb-10 border-2 shadow-2xl">
        <div className="flex flex-col items-center gap-6 relative z-[101]">
          <div className="rounded-full bg-green-100 p-4 animate-in zoom-in spin-in-12 duration-500">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          <div className="space-y-2">
            <DialogTitle className="text-3xl font-bold tracking-tight text-center">Thank You!</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Your order is being prepared.
            </DialogDescription>
          </div>

          <div className="bg-muted/50 w-full rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-mono text-xl font-bold">#{data.orderId}</span>
            </div>
            
            {data.pointsEarned > 0 && (
              <div className="flex justify-between items-center text-amber-600">
                <span className="flex items-center gap-2 font-medium">
                  <Star className="h-4 w-4 fill-current" /> Points Earned
                </span>
                <span className="text-xl font-bold">+{data.pointsEarned}</span>
              </div>
            )}
          </div>

          {data.customerName && (
            <p className="text-sm text-muted-foreground">
              Thanks for being a member, <strong>{data.customerName}</strong>!
            </p>
          )}

          <div className="w-full">
            <Button size="lg" className="w-full text-lg h-14 mt-2" onClick={() => onOpenChange(false)}>
                Start New Order
            </Button>
            <p className="text-xs text-muted-foreground mt-4 animate-pulse">
                Screen closing in {countdown}s
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}