import { NextResponse } from 'next/server';

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
const DEFAULT_LOCATION = process.env.NEXT_PUBLIC_WEATHER_LOCATION || 'College Station';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface WeatherCache {
  data: {
    temp: number;
    description: string;
    icon: string;
    city: string;
  };
  timestamp: number;
}

// In-memory cache (module-level, persists across requests)
const weatherCache = new Map<string, WeatherCache>();

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

async function fetchWeatherFromAPI(location: string) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not configured');
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('q', location);
  url.searchParams.set('appid', OPENWEATHER_API_KEY);
  url.searchParams.set('units', 'imperial');

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`OpenWeather API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    description: data.weather[0]?.description
      ? data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)
      : 'Unknown',
    icon: data.weather[0]?.icon ?? '',
    city: data.name ?? location,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location') || DEFAULT_LOCATION;

  const now = Date.now();
  const cached = weatherCache.get(location);

  // Return cached data if still fresh
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Fetch fresh data
  try {
    const fresh = await fetchWeatherFromAPI(location);
    weatherCache.set(location, { data: fresh, timestamp: now });
    return NextResponse.json(fresh);
  } catch (err) {
    // On error, return gracefully — never show an error state to the user
    const fallback = {
      temp: '—' as string | number,
      description: 'Unavailable',
      icon: '',
      city: '',
    };
    return NextResponse.json(fallback);
  }
}