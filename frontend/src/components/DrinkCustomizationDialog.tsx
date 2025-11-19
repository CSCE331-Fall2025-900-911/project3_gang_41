import { useState, useEffect } from "react";
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

interface DrinkCustomization {
  sweetness: 100 | 50 | 25;
  ice: 'regular' | 'light' | 'none';
  size: 'small' | 'medium' | 'large';
}

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize {itemName}</DialogTitle>
          <DialogDescription>
            Adjust the drink to your preferences
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Size</Label>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={customization.size === size ? "default" : "outline"}
                  onClick={() => setCustomization({ ...customization, size })}
                  className="capitalize"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Sweetness Selection */}
          <div className="space-y-2">
            <Label>Sweetness</Label>
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
            <Label>Ice</Label>
            <div className="grid grid-cols-3 gap-2">
              {iceOptions.map((ice) => (
                <Button
                  key={ice}
                  type="button"
                  variant={customization.ice === ice ? "default" : "outline"}
                  onClick={() => setCustomization({ ...customization, ice })}
                  className="capitalize"
                >
                  {ice}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}