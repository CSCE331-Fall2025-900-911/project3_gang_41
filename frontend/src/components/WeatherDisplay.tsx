import { Sun, Cloud, CloudRain, CloudSun, CloudLightning, Wind } from 'lucide-react';

const iconMap = {
  'sun': Sun,
  'cloud': Cloud,
  'cloud-rain': CloudRain,
  'cloud-sun': CloudSun,
  'cloud-lightning': CloudLightning,
  'wind': Wind,
};

interface WeatherDisplayProps {
  temperature: number;
  icon: string;
}

export const WeatherDisplay = ({ temperature, icon }: WeatherDisplayProps) => {
  const Icon = iconMap[icon as keyof typeof iconMap] || Sun;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      <span>{temperature}°F</span>
    </div>
  );
};
