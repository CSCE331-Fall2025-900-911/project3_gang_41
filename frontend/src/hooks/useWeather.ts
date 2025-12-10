import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export function useWeather() {
  const [weather, setWeather] = useState<{ temperature: number; icon: string } | null>(null);

  useEffect(() => {
    fetchApi<{ temperature: number; icon: string }>("/api/weather/current")
      .then((data) => setWeather(data))
      .catch(() => setWeather(null));
  }, []);

  return weather;
}
