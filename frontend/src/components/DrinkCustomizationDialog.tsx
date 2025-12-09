import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type DrinkCustomization,
  DEFAULT_CUSTOMIZATION,
  ICE_OPTIONS,
  SIZE_OPTIONS,
  SWEETNESS_OPTIONS,
  TOPPING_PRICE,
  TOPPING_OPTIONS,
  type ToppingOption,
} from "@project3/shared";
import { formatCurrency } from "@/lib/utils";
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

type Temperature = "hot" | "cold";
const TEMPERATURE_OPTIONS: Temperature[] = ["hot", "cold"];

interface ExtendedCustomization extends Omit<DrinkCustomization, "toppings"> {
  temperature: Temperature;
  toppings: ToppingOption[];
}

const DEFAULT_EXTENDED: ExtendedCustomization = {
  ...DEFAULT_CUSTOMIZATION,
  temperature: "cold",
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
  const [customization, setCustomization] = useState<ExtendedCustomization>(
    DEFAULT_EXTENDED
  );

  useEffect(() => {
    if (open) {
      if (defaultCustomization) {
        setCustomization({
          ...DEFAULT_EXTENDED,
          ...defaultCustomization,
          toppings: (defaultCustomization.toppings as ToppingOption[]) || [],
          temperature: "cold",
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
      temperature: customization.temperature,
      toppings: customization.toppings,
    };
    onConfirm(baseCustomization, 1);
    onOpenChange(false);
  };

  const toggleTopping = (topping: ToppingOption) => {
    setCustomization((prev) => ({
      ...prev,
      toppings: prev.toppings.includes(topping)
        ? prev.toppings.filter((t) => t !== topping)
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

  // ---------------- Height smoothing + ice collapse setup ----------------
  const measuredInnerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iceRef = useRef<HTMLDivElement | null>(null);
  const [wrapperHeight, setWrapperHeight] = useState<number | null>(null);
  const [iceNaturalHeight, setIceNaturalHeight] = useState<number | null>(null);

  // track first initialization so we can avoid forcing a height on first-open
  const hasInitializedRef = useRef(false);

  // disable transitions until we've initialized measurements to avoid first-frame animation
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  const clampTo80vh = (h: number) =>
    Math.min(h, Math.floor(window.innerHeight * 0.8));

  const measureInner = () => {
    const inner = measuredInnerRef.current;
    if (!inner) return 0;
    return clampTo80vh(inner.scrollHeight);
  };

  const measureIce = () => {
    const iceEl = iceRef.current;
    if (!iceEl) return 0;
    return iceEl.scrollHeight;
  };

  // initial measurement + ResizeObserver
  useLayoutEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      setWrapperHeight(null);
      setTransitionsEnabled(false);
      return;
    }

    // measure on next frame so DOM had a chance to layout
    requestAnimationFrame(() => {
      const measuredIce = measureIce() || 0;
      setIceNaturalHeight(measuredIce || null);

      if (!hasInitializedRef.current) {
        // FIRST open: DO NOT force wrapperHeight — let it size naturally and do not enable transitions yet.
        hasInitializedRef.current = true;
        setWrapperHeight(null);
        // Now enable transitions for later interactions (do this after layout is stable)
        // Use a micro delay to ensure the browser rendered the natural size before we enable transitions.
        // 0ms via requestAnimationFrame is usually enough, but setTimeout 0 keeps it robust.
        setTimeout(() => setTransitionsEnabled(true), 0);
      } else {
        // Subsequent opens: anchor wrapper so we animate as needed
        setWrapperHeight(measureInner() || null);
        setTransitionsEnabled(true);
      }
    });

    let ro: ResizeObserver | null = null;
    const inner = measuredInnerRef.current;
    if (inner && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => {
        setIceNaturalHeight(measureIce() || null);
        setWrapperHeight((prev) => (prev !== null ? measureInner() : prev));
      });
      ro.observe(inner);
    }

    const onResize = () => {
      setIceNaturalHeight(measureIce() || null);
      setWrapperHeight((prev) => (prev !== null ? measureInner() : prev));
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [open]);

  // ---------------- Temperature toggle that animates concurrently ----------------
  const TRANS_MS = 220;

  const setTemperatureAnimated = (newTemp: Temperature) => {
    if (newTemp === customization.temperature) return;

    const inner = measuredInnerRef.current;
    const iceEl = iceRef.current;
    if (!inner || !iceEl) {
      setCustomization((prev) => ({ ...prev, temperature: newTemp }));
      return;
    }

    const startHeight = measureInner();
    const naturalIce = measureIce() || 0;
    setIceNaturalHeight(naturalIce);

    // anchor wrapper to the start height
    setWrapperHeight(startHeight);

    // update selection immediately so button state updates
    setCustomization((prev) => ({ ...prev, temperature: newTemp }));

    // compute target height arithmetically so wrapper animates in sync with ice collapse
    let targetHeight = startHeight;
    if (newTemp === "cold") {
      targetHeight = clampTo80vh(startHeight + naturalIce);
    } else {
      targetHeight = clampTo80vh(Math.max(0, startHeight - naturalIce));
    }

    requestAnimationFrame(() => {
      setWrapperHeight(targetHeight);
      setTimeout(() => {
        setWrapperHeight(null);
      }, TRANS_MS + 30);
    });
  };

  const iceIsVisible = customization.temperature === "cold";
  // if we haven't measured ice yet, don't set maxHeight so initial render is natural (prevents flicker)
  const iceMaxHeight =
    iceIsVisible && iceNaturalHeight !== null ? `${iceNaturalHeight}px` : iceIsVisible ? undefined : "0px";

  // -------------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[31.25rem] transition-all duration-200">
        <DialogHeader>
          <DialogTitle>
            {translate("customization.title", { item: itemName })}
          </DialogTitle>
          <DialogDescription>
            {translate("customization.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Animated-height wrapper */}
        <div
          ref={wrapperRef}
          style={{
            height: wrapperHeight !== null ? `${wrapperHeight}px` : undefined,
            transition: transitionsEnabled ? `height ${TRANS_MS}ms ease` : "none",
          }}
          className="overflow-hidden"
        >
          {/* Actual content (scrolls if taller than 80vh) */}
          <div ref={measuredInnerRef} className="overflow-y-auto max-h-[80vh] pr-2">
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
                      onClick={() => setTemperatureAnimated(temp)}
                    >
                      {translate(temperatureTranslationKeys[temp])}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ice Selection - always mounted, but collapses/fades via max-height + opacity */}
              <div
                ref={iceRef}
                style={{
                  maxHeight: iceMaxHeight,
                  transition: transitionsEnabled ? `max-height ${TRANS_MS}ms ease, opacity ${TRANS_MS}ms ease` : "none",
                  opacity: iceIsVisible ? 1 : 0,
                  overflow: "hidden",
                  pointerEvents: iceIsVisible ? "auto" : "none",
                }}
                className="space-y-2"
                aria-hidden={!iceIsVisible}
              >
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

              {/* Toppings Multi-Select */}
              <div className="space-y-2">
                <Label>{translate("customization.toppings")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TOPPING_OPTIONS.map((topping) => {
                    const selected = customization.toppings.includes(topping);
                    return (
                      <Button
                        key={topping}
                        type="button"
                        size="default"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleTopping(topping)}
                        className={`relative justify-start px-3 h-12 transition-all ${selected ? "pl-9" : "pl-3"}`}
                      >
                        {selected && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Check className="h-4 w-4" />
                          </span>
                        )}

                        <div className="flex flex-col items-start truncate">
                          <span className="truncate w-full leading-tight">
                            {translate(`customization.${topping}`)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal -mt-0.5">
                            +{formatCurrency(TOPPING_PRICE)}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-1">
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
