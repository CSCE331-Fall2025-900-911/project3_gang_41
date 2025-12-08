import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type DrinkCustomization,
  DEFAULT_CUSTOMIZATION,
  ICE_OPTIONS,
  SIZE_OPTIONS
} from "@project3/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Local types for display-only options
type SugarLevel = 'none' | 'less' | 'regular' | 'more';
type Temperature = 'hot' | 'cold';

const SUGAR_OPTIONS: SugarLevel[] = ['none', 'less', 'regular', 'more'];
const TEMPERATURE_OPTIONS: Temperature[] = ['hot', 'cold'];

const TOPPING_OPTIONS = [
  'tapiocaPearls',
  'coconutJelly',
  'aloeVera',
  'redBean',
  'lycheeJelly',
  'crystalBoba',
] as const;

type ToppingOption = typeof TOPPING_OPTIONS[number];

// Extended customization for local state (display only)
interface ExtendedCustomization extends DrinkCustomization {
  sugar: SugarLevel;
  temperature: Temperature;
  toppings: ToppingOption[];
}

const DEFAULT_EXTENDED: ExtendedCustomization = {
  ...DEFAULT_CUSTOMIZATION,
  sugar: 'regular',
  temperature: 'cold',
  toppings: [],
};

interface DrinkCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  defaultCustomization?: DrinkCustomization;
  onConfirm: (customization: DrinkCustomization, quantity: number) => void;
}

export function DrinkCustomizationDialog({
  open,
  onOpenChange,
  itemName,
  defaultCustomization,
  onConfirm,
}: DrinkCustomizationDialogProps) {
  const { t: translate } = useTranslation();
  const [customization, setCustomization] = useState<ExtendedCustomization>(DEFAULT_EXTENDED);
  const [toppingsOpen, setToppingsOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultCustomization) {
        setCustomization({
          ...defaultCustomization,
          sugar: 'regular',
          temperature: 'cold',
          toppings: [],
        });
      } else {
        setCustomization(DEFAULT_EXTENDED);
      }
      setToppingsOpen(false);
    }
  }, [defaultCustomization, open]);

  const handleConfirm = () => {
    // Pass back only the DrinkCustomization fields (ignore extended display-only fields for DB)
    const baseCustomization: DrinkCustomization = {
      size: customization.size,
      sweetness: customization.sweetness,
      ice: customization.ice,
    };
    onConfirm(baseCustomization, 1);
    onOpenChange(false);
  };

  const toggleTopping = (topping: ToppingOption) => {
    setCustomization(prev => ({
      ...prev,
      toppings: prev.toppings.includes(topping)
        ? prev.toppings.filter(t => t !== topping)
        : [...prev.toppings, topping],
    }));
  };

  const sizeTranslationKeys: Record<string, string> = {
    small: "customization.small",
    medium: "customization.medium",
    large: "customization.large",
  };

  const iceTranslationKeys: Record<string, string> = {
    regular: "customization.regular",
    light: "customization.light",
    none: "customization.none",
  };

  const sugarTranslationKeys: Record<SugarLevel, string> = {
    none: "customization.noSugar",
    less: "customization.lessSugar",
    regular: "customization.regularSugar",
    more: "customization.moreSugar",
  };

  const temperatureTranslationKeys: Record<Temperature, string> = {
    hot: "customization.hot",
    cold: "customization.cold",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{translate("customization.title", { item: itemName })}</DialogTitle>
          <DialogDescription>
            {translate("customization.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] pr-2">
          <div className="grid gap-4 py-2">
            {/* Size Selection */}
            <div className="space-y-2">
              <Label>{translate("customization.size")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={customization.size === size ? "default" : "outline"}
                    onClick={() => setCustomization({ ...customization, size })}
                  >
                    {translate(sizeTranslationKeys[size])}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sugar Selection */}
            <div className="space-y-2">
              <Label>{translate("customization.sugar")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {SUGAR_OPTIONS.map((sugar) => (
                  <Button
                    key={sugar}
                    type="button"
                    size="sm"
                    variant={customization.sugar === sugar ? "default" : "outline"}
                    onClick={() => setCustomization({ ...customization, sugar })}
                  >
                    {translate(sugarTranslationKeys[sugar])}
                  </Button>
                ))}
              </div>
            </div>

            {/* Temperature Selection */}
            <div className="space-y-2">
              <Label>{translate("customization.temperature")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPERATURE_OPTIONS.map((temp) => (
                  <Button
                    key={temp}
                    type="button"
                    variant={customization.temperature === temp ? "default" : "outline"}
                    onClick={() => setCustomization({ ...customization, temperature: temp })}
                  >
                    {translate(temperatureTranslationKeys[temp])}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ice Selection - Hidden if Hot */}
            {customization.temperature === 'cold' && (
              <div className="space-y-2">
                <Label>{translate("customization.ice")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ICE_OPTIONS.map((ice) => (
                    <Button
                      key={ice}
                      type="button"
                      variant={customization.ice === ice ? "default" : "outline"}
                      onClick={() => setCustomization({ ...customization, ice })}
                    >
                      {translate(iceTranslationKeys[ice])}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings Multi-Select */}
            <div className="space-y-2">
              <Label>{translate("customization.toppings")}</Label>
              <Collapsible open={toppingsOpen} onOpenChange={setToppingsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="text-muted-foreground">
                      {customization.toppings.length === 0
                        ? translate("customization.selectToppings")
                        : `${customization.toppings.length} ${translate("customization.selected")}`}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${toppingsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-lg p-2 flex flex-col gap-1">
                    {TOPPING_OPTIONS.map((topping) => (
                      <Button
                        key={topping}
                        type="button"
                        size="sm"
                        variant={customization.toppings.includes(topping) ? "default" : "ghost"}
                        className="justify-start h-9"
                        onClick={() => toggleTopping(topping)}
                      >
                        {customization.toppings.includes(topping) && (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        {translate(`customization.${topping}`)}
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Selected toppings badges */}
              {customization.toppings.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {customization.toppings.map((topping) => (
                    <Badge
                      key={topping}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => toggleTopping(topping)}
                    >
                      {translate(`customization.${topping}`)} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translate("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {translate("common.addToCart")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
