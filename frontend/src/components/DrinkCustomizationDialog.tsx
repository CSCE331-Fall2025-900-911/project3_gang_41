import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { DrinkCustomization } from "@project3/shared";
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


interface DrinkCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  defaultCustomization?: DrinkCustomization;
  onConfirm: (customization: DrinkCustomization) => void;
}

const defaultCustomizationValues: DrinkCustomization = {
  sweetness: 100,
  ice: 'regular',
  size: 'medium',
};

export function DrinkCustomizationDialog({
  open,
  onOpenChange,
  itemName,
  defaultCustomization,
  onConfirm,
}: DrinkCustomizationDialogProps) {
  const { t: translate } = useTranslation();
  const [customization, setCustomization] = useState<DrinkCustomization>(
    defaultCustomization || defaultCustomizationValues
  );

  useEffect(() => {
    if (defaultCustomization) {
      setCustomization(defaultCustomization);
    } else {
      setCustomization(defaultCustomizationValues);
    }
  }, [defaultCustomization, open]);

  const handleConfirm = () => {
    onConfirm(customization);
    onOpenChange(false);
  };

  const sweetnessOptions: Array<100 | 50 | 25> = [100, 50, 25];
  const iceOptions: Array<'regular' | 'light' | 'none'> = ['regular', 'light', 'none'];
  const sizeOptions: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{translate("customization.title", { item: itemName })}</DialogTitle>
          <DialogDescription>
            {translate("customization.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Size Selection */}
          <div className="space-y-2">
            <Label>{translate("customization.size")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map((size) => (
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

          {/* Sweetness Selection */}
          <div className="space-y-2">
            <Label>{translate("customization.sweetness")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {sweetnessOptions.map((sweetness) => (
                <Button
                  key={sweetness}
                  type="button"
                  variant={customization.sweetness === sweetness ? "default" : "outline"}
                  onClick={() => setCustomization({ ...customization, sweetness })}
                >
                  {sweetness}%
                </Button>
              ))}
            </div>
          </div>

          {/* Ice Selection */}
          <div className="space-y-2">
            <Label>{translate("customization.ice")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {iceOptions.map((ice) => (
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
        </div>
        <DialogFooter>
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