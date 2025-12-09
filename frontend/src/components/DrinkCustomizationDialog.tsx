import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type DrinkCustomization,
  DEFAULT_CUSTOMIZATION,
  ICE_OPTIONS,
  SIZE_OPTIONS,
  SWEETNESS_OPTIONS,
  TOPPING_PRICE, // Import the constant
  TOPPING_OPTIONS,
  type ToppingOption,
} from "@project3/shared";
import { formatCurrency } from "@/lib/utils"; // Import formatter
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
import { Check } from "lucide-react";

type Temperature = 'hot' | 'cold';
const TEMPERATURE_OPTIONS: Temperature[] = ['hot', 'cold'];


interface ExtendedCustomization extends Omit<DrinkCustomization, 'toppings'> {
  temperature: Temperature;
  toppings: ToppingOption[]; 
}

const DEFAULT_EXTENDED: ExtendedCustomization = {
  ...DEFAULT_CUSTOMIZATION,
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

  useEffect(() => {
    if (open) {
      if (defaultCustomization) {
        setCustomization({
          ...DEFAULT_EXTENDED,
          ...defaultCustomization,
          toppings: (defaultCustomization.toppings as ToppingOption[]) || [],
          temperature: 'cold', 
        });
      } else {
        setCustomization(DEFAULT_EXTENDED);
      }
    }
  }, [defaultCustomization, open]);

  const handleConfirm = () => {
    const baseCustomization: DrinkCustomization = {
      size: customization.size,
      sweetness: customization.sweetness,
      ice: customization.ice,
      toppings: customization.toppings,
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

  const temperatureTranslationKeys: Record<Temperature, string> = {
    hot: "customization.hot",
    cold: "customization.cold",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{translate("customization.title", { item: itemName })}</DialogTitle>
          <DialogDescription>
            {translate("customization.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[80vh] pr-2">
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
                {SWEETNESS_OPTIONS.map((level) => (
                  <Button
                    key={level}
                    type="button"
                    size="sm"
                    variant={customization.sweetness === level ? "default" : "outline"}
                    onClick={() => setCustomization({ ...customization, sweetness: level })}
                    className="px-0"
                  >
                    {level}%
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
              <div className="grid grid-cols-2 gap-2">
                {TOPPING_OPTIONS.map((topping) => (
                  <Button
                    key={topping}
                    type="button"
                    size="sm"
                    variant={customization.toppings.includes(topping) ? "default" : "outline"}
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => toggleTopping(topping)}
                  >
                    {customization.toppings.includes(topping) && (
                      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                    )}
                    <div className="flex flex-col items-start text-left truncate">
                        <span className="truncate w-full leading-tight">
                            {translate(`customization.${topping}`)}
                        </span>
                        {/* Show price hint */}
                        <span className="text-[10px] text-muted-foreground font-normal">
                            +{formatCurrency(TOPPING_PRICE)}
                        </span>
                    </div>
                  </Button>
                ))}
              </div>
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