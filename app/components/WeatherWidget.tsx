'use client';

import { useState, useEffect } from 'react';

interface WeatherData {
  temp: string | number;
  description: string;
  icon: string;
  city: string;
}

function iconCodeToEmoji(code: string): string {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '🌤️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '🌨️', '13n': '🌨️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return map[code] ?? '🌡️';
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) throw new Error('Weather fetch failed');
      const data: WeatherData = await res.json();
      setWeather(data);
    } catch {
      // Gracefully show Unavailable — do not set error state
      setWeather({ temp: '—', description: 'Unavailable', icon: '', city: '' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !weather) {
    return (
      <div className="bg-sky-100 border border-sky-300 rounded-full px-3 py-1.5 text-sm font-semibold text-sky-500">
        Loading...
      </div>
    );
  }

  const emoji = iconCodeToEmoji(weather.icon);

  return (
    <div className="bg-sky-100 border border-sky-300 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-700">
      <span>{emoji}</span>
      <span>{weather.description} · {weather.temp}°F</span>
    </div>
  );
}