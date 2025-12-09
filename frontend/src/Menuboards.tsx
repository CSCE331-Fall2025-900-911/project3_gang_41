import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchApi } from '@/lib/api';
import { useNavigate } from "react-router-dom";

import type { MenuItem } from "@project3/shared";

import { 
  ShoppingCart, ChevronLeft
} from 'lucide-react';

import { WeatherDisplay } from '@/components/WeatherDisplay';

export default function Menuboards() {
  const { t: translate } = useTranslation();

  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);
  

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

  return (
    <div className="flex h-screen flex-col bg-background">

      <header className="flex items-center justify-between p-4 bg-white shadow">
        {weather && (
          <div className="px-2 py-2">
            <WeatherDisplay temperature={weather.temperature} icon={weather.icon} />
          </div>
        )}

        <h1 className="text-2xl font-bold">Menu Board</h1>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 active:bg-primary/80 flex items-center gap-2"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Back to login
          </button>
          <button
            onClick={() => navigate("/kiosk")}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 active:bg-primary/80 flex items-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            Place an order
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-8xl mx-auto">
          <ul className="divide-y divide-border">
            {menu.map((item) => (
              <li
                key={item.item_id}
                role="button"
                tabIndex={0}
                aria-label={translate("aria.addToCart", { item: item.item_name })}
                className="flex items-center gap-6 py-4 px-4 cursor-pointer transition hover:bg-muted active:bg-muted/70"
              >
                {/* Image */}
                <img
                  src={item.image_url || "/brownsugarboba.jpg"}
                  alt={item.item_name}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm"
                />

                {/* Name */}
                <div className="flex-1">
                  <div className="text-lg font-semibold">{item.item_name}</div>
                </div>

                {/* Price */}
                <div className="text-xl font-bold text-primary">${item.cost.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );


}
