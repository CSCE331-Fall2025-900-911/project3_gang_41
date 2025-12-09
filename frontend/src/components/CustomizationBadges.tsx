import { Badge } from "@/components/ui/badge";
import { DrinkCustomization } from "@project3/shared";
import { useTranslation } from "react-i18next";

interface CustomizationBadgesProps {
  customization?: DrinkCustomization;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: "text-[10px] h-5 px-1.5",
  sm: "text-xs h-5 px-1.5", 
  md: "text-xs h-6 px-2",
  lg: "text-sm h-7 px-2.5",
};

export function CustomizationBadges({ 
  customization, 
  size = 'sm',
  className = ""
}: CustomizationBadgesProps) {
  const { t: translate } = useTranslation();
  
  if (!customization) return null;
  
  const badgeSizeClass = sizeClasses[size];
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {/* Size (Single Letter) */}
      {customization.size && (
        <Badge variant="secondary" className={`${badgeSizeClass} uppercase`}>
          {customization.size.charAt(0)}
        </Badge>
      )}
      
      {/* Sweetness (Hide Default 100%) */}
      {customization.sweetness !== undefined && customization.sweetness !== 100 && (
        <Badge variant="secondary" className={`${badgeSizeClass}`}>
          {customization.sweetness}% {translate("common.sweet")}
        </Badge>
      )}
      
      {/* Temperature (Show HOT, hide COLD) */}
      {customization.temperature === 'hot' && (
        <Badge variant="secondary" className={`${badgeSizeClass} capitalize`}>
          {translate("customization.hot")}
        </Badge>
      )}
      
      {/* Ice (Hide Default 'regular') */}
      {customization.ice && customization.ice !== 'regular' && (
        <Badge variant="secondary" className={`${badgeSizeClass} capitalize`}>
          {customization.ice} {translate("common.ice")}
        </Badge>
      )}
      
      {/* Toppings (Translated + Plus Prefix) */}
      {customization.toppings?.map((topping, idx) => (
        <Badge key={idx} variant="secondary" className={`${badgeSizeClass} capitalize`}>
          + {translate(`customization.${topping}`)}
        </Badge>
      ))}
    </div>
  );
}

export default CustomizationBadges;
