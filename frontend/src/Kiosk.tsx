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
  CreditCard, Banknote, User, Star, LogOut, CheckCircle, History, Eye
} from 'lucide-react';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { DrinkCustomizationDialog } from "@/components/DrinkCustomizationDialog";
import { useCart } from "@/hooks/useCart";
import { useCustomer } from "@/contexts/CustomerContext";
import { MemberLoginDialog } from "@/components/MemberLoginDialog";
import { PastOrdersDialog } from "@/components/PastOrdersDialog";
import { CustomizationBadges } from "@/components/CustomizationBadges";
import { useSpeech } from "@/hooks/useSpeech";
import { useFontSize, type FontSize } from "@/hooks/useFontSize"; 
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { useWeather } from "@/hooks/useWeather";
import { useMenuTranslation } from "@/hooks/useMenuTranslation"; // IMPORT HOOK

import {
  PRODUCT_CATEGORIES, 
  CATEGORY_TRANSLATION_KEYS, 
  type MenuItem, 
  type CartItem, 
  type DrinkCustomization,
  TAX_RATE,
  calculateTax,
  generateCartItemId,
  TOPPING_PRICE,
  SIZE_PRICE_MODIFIERS
} from "@project3/shared";

interface SuccessData {
  orderId: number;
  pointsEarned: number;
  customerName?: string;
}

const CONFETTI_GLOBAL_OPTIONS = { resize: true, useWorker: true };

export default function Kiosk() {
  const { t: translate } = useTranslation();
  const confettiRef = useRef<ConfettiRef>(null);
  
  // -- AUDIO / TTS LOGIC --
  const { enabled: ttsEnabled, setEnabled: setTtsEnabled, speak } = useSpeech();

  const { customer, logoutCustomer } = useCustomer();
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestDialog, setGuestDialog] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [memberBtnFlash, setMemberBtnFlash] = useState(false);
  
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  
  // USE THE TRANSLATION HOOK
  const { translatedMenu } = useMenuTranslation(menu);

  const { cart, addToCart, removeFromCart, updateQuantity, updateCartItem, checkout, isSubmitting } = useCart();
  
  const [activeCategory, setActiveCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buttonPulse, setButtonPulse] = useState(false);
  
  const weather = useWeather();

  const [experimentalMode, setExperimentalMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const { fontSize, setFontSize } = useFontSize();
  
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
  }, []);

  useEffect(() => {
    if (customer) return;
    const interval = setInterval(() => {
      setMemberBtnFlash(true);
      setTimeout(() => setMemberBtnFlash(false), 500);
    }, 1000);
    return () => clearInterval(interval);
  }, [customer]);

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
    speak(translate('tts.customize', { item: item.item_name }));
    setCustomizationDialog({ open: true, item, editingCartItem: null });
  };

  const openEditDialog = (cartItem: CartItem) => {
    // Find item in TRANSLATED menu to ensure dialog shows translated name
    const menuItem = translatedMenu.find((m) => m.item_id === cartItem.item_id);
    if (menuItem) {
      setCustomizationDialog({
        open: true,
        item: menuItem,
        editingCartItem: cartItem,
      });
    }
  };

  const handleCustomizationConfirm = (customization: DrinkCustomization, quantity: number) => {
    if (!customizationDialog.item) return;

    const basePrice = customizationDialog.item.cost;
    const sizeAdjustment = SIZE_PRICE_MODIFIERS[customization.size] ?? 0;
    const toppingCost = (customization.toppings?.length || 0) * TOPPING_PRICE;
    const finalUnitCost = basePrice + sizeAdjustment + toppingCost;

    if (customizationDialog.editingCartItem) {
      updateCartItem(customizationDialog.editingCartItem.uniqueId, { customization, cost: finalUnitCost });
    } else {
      for (let i = 0; i < quantity; i++) {
        const newCartItem: CartItem = {
          item_id: customizationDialog.item.item_id,
          item_name: customizationDialog.item.item_name,
          cost: finalUnitCost,
          quantity: 1,
          customization,
          uniqueId: `${generateCartItemId(customizationDialog.item.item_id, customization)}-${Date.now()}-${i}`,
        };
        addToCart(newCartItem);
      }
      speak(translate('tts.itemAdded', { item: customizationDialog.item.item_name }));

      setButtonPulse(true);
      setTimeout(() => setButtonPulse(false), 500);
    }
    setCustomizationDialog({ open: false, item: null, editingCartItem: null });
  };

  const handleReorder = (items: CartItem[]) => {
    items.forEach(item => addToCart(item));
    speak(translate('tts.itemAdded', { item: `${items.length} items` }));
    // Delay drawer opening to prevent animation glitches
    setTimeout(() => {
      setDrawerOpen(true);
    }, 200);
  };

  const total = cart.reduce((sum, item: CartItem) => sum + (item.cost * item.quantity), 0);
  const POINTS_PER_DOLLAR = 100;
  const maxDiscount = customer ? Math.floor(customer.points / POINTS_PER_DOLLAR) : 0;
  const discountAmount = usePoints ? Math.min(maxDiscount, total) : 0;
  const pointsToBurn = discountAmount * POINTS_PER_DOLLAR;
  const taxableAmount = Math.max(0, total - discountAmount);
  const tax = calculateTax(taxableAmount);
  const finalTotal = taxableAmount + tax;
  const estimatedPointsEarned = Math.floor(total * 10);

  const handleCheckout = () => {
    const wasCustomer = !!customer;
    const name = customer?.customer_name;
    checkout(
      paymentMethod,
      (orderId) => {
        speak(translate('tts.orderConfirmed', { number: orderId }));
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
      
      {highContrast && (
        <style>{`
          .text-muted-foreground { color: #0f172a !important; }
          .text-gray-400, .text-gray-500, .text-gray-600 { color: #000000 !important; font-weight: 500 !important; }
          .bg-muted { background-color: #f1f5f9 !important; border: 1px solid #94a3b8; }
          .border { border-color: #000000 !important; }
          .lucide { color: #000000 !important; }
        `}</style>
      )}

      <Confetti 
        ref={confettiRef} 
        manualstart={true}
        globalOptions={CONFETTI_GLOBAL_OPTIONS} 
        className="fixed inset-0 z-[200] w-screen h-screen pointer-events-none" 
      />

      {/* Sidebar */}
      <nav className="w-80 bg-gray-50/50 dark:bg-gray-900/50 border-r p-5 flex flex-col gap-4" aria-label="Main Navigation">
        <div className="mb-2 flex items-center justify-center">
          <img src="/logo.jpg" alt="Logo" className="h-14 w-auto rounded-full shadow-sm" />
        </div>

        <div className="pb-2">
          {customer ? (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-md">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className='overflow-hidden'>
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Welcome Back</p>
                      <h3 className="font-bold text-lg truncate">{customer.customer_name}</h3>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-sm mt-1">
                        <Star className="h-4 w-4 fill-current" />
                        {customer.points} {translate("kioskCheckout.pts")}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-xs gap-1 px-1 bg-background hover:bg-white" 
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History className="h-4 w-4" /> {translate("manager.categories.history")}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 text-xs gap-1 px-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      onClick={logoutCustomer}
                    >
                      <LogOut className="h-4 w-4" /> {translate('common.logout')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button 
              variant="outline"
              className={`w-full justify-start gap-3 h-16 px-4 rounded-xl border bg-white dark:bg-card shadow-sm hover:shadow-md hover:bg-accent hover:border-primary/30 transition-all duration-300 relative overflow-hidden group
                ${memberBtnFlash ? "ring-2 ring-primary ring-offset-2" : ""}
              `}
              onClick={() => setLoginOpen(true)}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                 <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">{translate("member.loginTitle")}</span>
                <span className="text-xs text-muted-foreground">{translate("member.earnRewards")}</span>
              </div>
            </Button>
          )}
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {PRODUCT_CATEGORIES.map((category, index) => (
            <Button
              key={index}
              variant={activeCategory === category ? "default" : "ghost"}
              className={`w-full justify-start text-left h-12 px-4 rounded-xl text-base transition-all duration-200
                ${activeCategory === category
                  ? "shadow-md"
                  : "hover:bg-gray-200/50 dark:hover:bg-gray-800"
                }`}
              onMouseEnter={() => speak(translate(CATEGORY_TRANSLATION_KEYS[category]))}
              onClick={() => {
                setActiveCategory(category);
                speak(translate('tts.showing', { category: translate(CATEGORY_TRANSLATION_KEYS[category]) }));
              }}
            >
              {translate(CATEGORY_TRANSLATION_KEYS[category])}
            </Button>
          ))}
        </div>

        {weather && (
          <div className="px-1 py-1">
            <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />
          </div>
        )}

        <div className="px-1">
          <LanguageToggle onSpeak={speak} />
        </div>

        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  <span className="text-sm">{translate('kiosk.experimental')}</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 py-3 space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg mt-2">
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
                    if (checked) {
                      // Speak immediately after enabling (bypass the hook's enabled check)
                      const utterance = new SpeechSynthesisUtterance(translate('tts.enabled'));
                      utterance.lang = 'en-US';
                      speechSynthesis.speak(utterance);
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="high-contrast" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  {translate('kiosk.highContrast')}
                </label>
                <Switch
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="font-size" className="text-sm text-muted-foreground">
                  {translate('kiosk.fontSize')}
                </label>
                <select
                  id="font-size"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as FontSize)}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value="default">{translate('kiosk.fontDefault')}</option>
                  <option value="large">{translate('kiosk.fontLarge')}</option>
                  <option value="extra-large">{translate('kiosk.fontExtraLarge')}</option>
                </select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <h1 className="sr-only">Boba Tea Kiosk Menu and Ordering</h1>
        
        {/* Scrollable Grid - USING TRANSLATED MENU */}
        <div className="flex-1 overflow-auto p-8 pb-32">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 tracking-tight">
              {translate(CATEGORY_TRANSLATION_KEYS[activeCategory as keyof typeof CATEGORY_TRANSLATION_KEYS])}           
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {translatedMenu
                .filter((item) => activeCategory === 'All Items' || item.category === activeCategory)
                .map(item => (
                <Card
                  key={item.item_id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 active:scale-95 active:shadow-md flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group"
                  onClick={() => openCustomizationDialog(item)}
                  onMouseEnter={() => speak(`${item.item_name}, $${item.cost.toFixed(2)}`)}
                  onFocus={() => speak(`${item.item_name}, $${item.cost.toFixed(2)}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={translate('aria.addToCart', { item: item.item_name })}
                  onKeyDown={(e) => e.key === 'Enter' && openCustomizationDialog(item)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg text-center line-clamp-1 group-hover:text-primary transition-colors">
                      {item.item_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex flex-col flex-1">
                    <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                      <img
                        src={item.image_url || "/brownsugarboba.jpg"}
                        alt={item.item_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    
                    <div className="space-y-2 mb-3 flex-1">
                      {/* Using translated description */}
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      {item.ingredients_list && item.ingredients_list.length > 0 && (
                        <div className="text-xs text-muted-foreground/80">
                          <span className="font-semibold">{translate("common.contains")}</span> {item.ingredients_list.map((i: any) => translate(i)).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-3 border-t flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">${item.cost.toFixed(2)}</span>
                      <Button size="sm" className="rounded-full px-4" variant="secondary">{translate("common.addToCart")}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Checkout Button Area */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div className="pointer-events-auto">
             <Button
                size="lg"
                className={`h-20 px-12 rounded-full shadow-xl text-xl font-bold flex items-center gap-3 transition-all duration-500 ${
                  buttonPulse ? 'scale-110 bg-green-600' : 'scale-100'
                } ${cart.length > 0 ? 'animate-in fade-in slide-in-from-bottom-4' : 'opacity-90'}`}
                variant={cart.length > 0 ? "default" : "secondary"}
                onClick={handleMainCheckoutClick}
              >
                <div className="relative">
                  <ShoppingCart className="h-8 w-8" aria-hidden="true" />
                  {cart.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs rounded-full border-2 border-background">
                      {cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </div>
                <span>{translate('common.checkout')}</span>
                {cart.length > 0 && (
                  <span className="bg-primary-foreground/20 px-3 py-1 rounded text-lg ml-2">
                    ${total.toFixed(2)}
                  </span>
                )}
              </Button>
          </div>
        </div>
      </main>

      {/* CHECKOUT DRAWER */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-[2rem]">
          <DrawerHeader className="flex-none text-center pb-2">
            <DrawerTitle className="text-2xl font-bold">{translate('kiosk.yourOrder')}</DrawerTitle>
            <DrawerDescription className="text-base">{translate('kiosk.reviewItems')}</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 flex flex-col md:flex-row gap-8 px-6 md:px-12 pb-8 min-h-0">
            {/* Left: Cart Items */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                    <ShoppingCart className="h-20 w-20 mb-4 stroke-1" aria-hidden="true" />
                    <p className="text-xl font-medium">{translate('kiosk.cartEmpty')}</p>
                    <p className="mt-2">{translate('kiosk.addItemsToStart')}</p>
                  </div>
               ) : (
                 <div className="space-y-4">
                   {cart.map((item: CartItem) => {
                     // CART TRANSLATION LOOKUP LOGIC
                     const displayItem = translatedMenu.find(m => m.item_id === item.item_id);
                     const displayName = displayItem ? displayItem.item_name : item.item_name;
                     const displayImage = displayItem?.image_url || "/brownsugarboba.jpg";

                     return (
                       <div key={item.uniqueId} className="bg-card border rounded-2xl p-4 shadow-sm flex gap-4">
                            <img 
                              src={displayImage} 
                              alt={displayName}
                              className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-muted" 
                            />
                            <div className="flex-1 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h4 className="font-bold text-lg">{displayName}</h4>
                                    <p className="text-sm text-muted-foreground font-medium">
                                      ${item.cost.toFixed(2)} {translate('common.each')}
                                    </p>
                                 </div>
                                 <span className="font-bold text-lg">${(item.cost * item.quantity).toFixed(2)}</span>
                              </div>
                              
                              {item.customization && (
                                <div className="mt-1 mb-2">
                                  <CustomizationBadges customization={item.customization} size="sm" />
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                 <div className="flex items-center bg-muted/50 rounded-lg p-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}><Minus className="h-4 w-4"/></Button>
                                    <span className="text-base font-bold w-8 text-center tabular-nums">{item.quantity}</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}><Plus className="h-4 w-4"/></Button>
                                 </div>
                                 
                                 <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={() => openEditDialog(item)}>
                                      <Edit className="h-3 w-3 mr-1" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.uniqueId)}>
                                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                 </div>
                              </div>
                            </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>

            {/* Right: Payment & Points */}
            <div className="w-full md:w-[400px] flex-none flex flex-col justify-end bg-muted/30 p-6 rounded-2xl border">
              <div className="space-y-5">
                
                {customer && customer.points >= 100 && (
                  <div className="bg-white dark:bg-card p-4 rounded-xl border border-amber-200/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-100 p-1.5 rounded-full">
                              <Star className="h-4 w-4 text-amber-600 fill-current" />
                            </div>
                            <span className="font-bold text-amber-900 dark:text-amber-100">{translate("kioskCheckout.usePoints")}</span>
                        </div>
                        <Switch 
                            checked={usePoints} 
                            onCheckedChange={setUsePoints}
                            className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="text-sm text-amber-800 dark:text-amber-200/80 pl-1">
                        {translate("kioskCheckout.balance")} <strong className="text-amber-600">{customer.points}</strong> {translate("kioskCheckout.pts")}
                        {usePoints ? (
                            <div className="mt-2 font-bold text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded text-center">
                              {translate("kioskCheckout.saving")} ${discountAmount.toFixed(2)} (-{pointsToBurn} pts)
                            </div>
                        ) : (
                            <div className="mt-1 text-xs opacity-80">
                              {translate("kioskCheckout.maxDiscount")} <strong>${maxDiscount.toFixed(2)}</strong>
                            </div>
                        )}
                      </div>
                  </div>
                )}

                <div className="space-y-3 pb-4 border-b border-dashed">
                  <div className="flex justify-between text-muted-foreground"><span>{translate('common.subtotal')}</span> <span>${total.toFixed(2)}</span></div>
                  {usePoints && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>{translate('kioskCheckout.pointsDiscount')}</span> <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                  )}
                  <div className="flex justify-between text-muted-foreground"><span>{translate('common.tax')} ({(TAX_RATE * 100).toFixed(2)}%)</span> <span>${tax.toFixed(2)}</span></div>
                  <div className="flex justify-between text-3xl font-bold pt-2"><span>{translate('common.total')}</span> <span>${finalTotal.toFixed(2)}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    className={`h-14 rounded-xl border-2 ${paymentMethod === 'card' ? 'border-primary' : 'border-transparent bg-white dark:bg-card hover:border-gray-300'}`}
                    onClick={() => {
                      setPaymentMethod('card');
                      speak(translate('tts.selected', { option: 'Card' }));
                    }}
                  >
                    <CreditCard className="mr-2 h-5 w-5" /> {translate('checkout.card')}
                  </Button>
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    className={`h-14 rounded-xl border-2 ${paymentMethod === 'cash' ? 'border-primary' : 'border-transparent bg-white dark:bg-card hover:border-gray-300'}`}
                    onClick={() => {
                      setPaymentMethod('cash');
                      speak(translate('tts.selected', { option: 'Cash' }));
                    }}
                  >
                    <Banknote className="mr-2 h-5 w-5" /> {translate('checkout.cash')}
                  </Button>
                </div>

                <Button size="lg" className="w-full h-16 text-xl rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleCheckout} disabled={isSubmitting || cart.length === 0}>
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : translate("kioskCheckout.payNow")}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={guestDialog} onOpenChange={setGuestDialog}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">{translate("kioskCheckout.guestTitle")}</DialogTitle>
              <DialogDescription className="text-center text-base">
                {translate("kioskCheckout.guestDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-4">
               <Button 
                  size="lg" 
                  className="w-full text-lg h-12 font-semibold" 
                  onClick={() => { setGuestDialog(false); setLoginOpen(true); }}
               >
                  {translate("kioskCheckout.guestSignup")}
               </Button>
               <Button 
                  variant="ghost" 
                  className="text-muted-foreground" 
                  onClick={() => { setGuestDialog(false); setDrawerOpen(true); }}
               >
                  {translate("kioskCheckout.guestContinue")}
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

function SuccessDialog({ data, open, onOpenChange }: { data: SuccessData | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const closeRef = useRef(onOpenChange);
  const { t: translate } = useTranslation();
  useEffect(() => { closeRef.current = onOpenChange; }, [onOpenChange]);

  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (open) {
      setCountdown(15);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            closeRef.current(false);
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
            <DialogTitle className="text-3xl font-bold tracking-tight text-center">{translate("kioskCheckout.successTitle")}</DialogTitle>
            <DialogDescription className="text-center text-lg">
              {translate("kioskCheckout.prepMsg")}
            </DialogDescription>
          </div>

          <div className="bg-muted/50 w-full rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-muted-foreground">{translate("kioskCheckout.orderNum")}</span>
              <span className="font-mono text-xl font-bold">#{data.orderId}</span>
            </div>
            
            {data.pointsEarned > 0 && (
              <div className="flex justify-between items-center text-amber-600">
                <span className="flex items-center gap-2 font-medium">
                  <Star className="h-4 w-4 fill-current" /> {translate("kioskCheckout.pointsEarned")}
                </span>
                <span className="text-xl font-bold">+{data.pointsEarned}</span>
              </div>
            )}
          </div>

          {data.customerName && (
            <p className="text-sm text-muted-foreground">
              {translate("kioskCheckout.memberThanks", { name: data.customerName })}
            </p>
          )}

          <div className="w-full">
            <Button size="lg" className="w-full text-lg h-14 mt-2" onClick={() => onOpenChange(false)}>
              {translate("kioskCheckout.startNew")}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 animate-pulse">
              {translate("kioskCheckout.closingIn", { seconds: countdown })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}