"use client";

import { useState, useEffect } from "react";
import {
  formatHour,
  getBackgroundClass,
  getWeatherDetails,
  isSnowy,
  isStormy,
} from "@/lib/weather";

type LocationOption = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type HourlyForecast = {
  time: string;
  temperature: number;
  weatherCode: number;
};

type WeatherData = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  forecast: ForecastDay[];
  hourly: HourlyForecast[];
};

type ForecastDay = {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
};

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export default function Home() {
  const [city, setCity] = useState("");
  const [searchedCity, setSearchedCity] = useState("Indianapolis");

  const [weather, setWeather] = useState<WeatherData>({
    temperature: 74,
    feelsLike: 72,
    humidity: 45,
    windSpeed: 9,
    weatherCode: 0,
    forecast: [],
    hourly: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [error, setError] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);

  useEffect(() => {
    const searchTerm = city.trim();

    if (searchTerm.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingLocations(true);
      setError("");

      try {
        const locationResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`,
          { signal: controller.signal },
        );

        if (!locationResponse.ok) {
          throw new Error("Unable to search for locations.");
        }

        const locationData = await locationResponse.json();
        const locations: LocationOption[] = locationData.results ?? [];

        setLocationOptions(locations);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setIsSearchingLocations(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [city]);

  async function handleSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchTerm = city.trim();

    if (!searchTerm) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const locationResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`,
      );

      if (!locationResponse.ok) {
        throw new Error("Unable to search for that city.");
      }

      const locationData = await locationResponse.json();
      const locations: LocationOption[] = locationData.results ?? [];

      if (locations.length === 0) {
        throw new Error("City not found. Try another search.");
      }

      setLocationOptions(locations);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLocationSelect(location: LocationOption) {
    setIsLoading(true);
    setError("");
    setLocationOptions([]);

    try {
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto&hourly=temperature_2m,weather_code&forecast_hours=24`,
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to retrieve the weather.");
      }

      const weatherData = await weatherResponse.json();

      const locationLabel = location.admin1
        ? `${location.name}, ${location.admin1}`
        : location.name;

      setSearchedCity(locationLabel);

      setWeather({
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: weatherData.current.wind_speed_10m,
        weatherCode: weatherData.current.weather_code,
        forecast: weatherData.daily.time.map((date: string, index: number) => ({
          date,
          high: weatherData.daily.temperature_2m_max[index],
          low: weatherData.daily.temperature_2m_min[index],
          weatherCode: weatherData.daily.weather_code[index],
        })),
        hourly: weatherData.hourly.time.map((time: string, index: number) => ({
          time,
          temperature: weatherData.hourly.temperature_2m[index],
          weatherCode: weatherData.hourly.weather_code[index],
        })),
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const weatherDetails = getWeatherDetails(weather.weatherCode);
  const backgroundClass = getBackgroundClass(weather.weatherCode);
  const isClear = weather.weatherCode === 0;
  const isCloudy = [1, 2, 3].includes(weather.weatherCode);
  const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
    weather.weatherCode,
  );
  const shouldShowSnow = isSnowy(weather.weatherCode);
  const shouldShowStorm = isStormy(weather.weatherCode);
  return (
    <main
      className={`relative min-h-screen overflow-hidden ${backgroundClass} px-6 py-12 text-slate-600`}
    >
      {isClear && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-200/80 blur-3xl"
        />
      )}
      {isCloudy && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 top-24 h-28 w-72 rounded-full bg-white/45 blur-2xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-56 h-24 w-64 rounded-full bg-white/35 blur-2xl"
          />
        </>
      )}
      {isRainy && (
        <div
          aria-hidden="true"
          className="rain-overlay pointer-events-none absolute inset-0 opacity-25"
        />
      )}
      {shouldShowSnow && (
        <div
          aria-hidden="true"
          className="snow-overlay pointer-events-none absolute inset-0 opacity-70"
        />
      )}

      {shouldShowStorm && (
        <>
          <div
            aria-hidden="true"
            className="storm-glow pointer-events-none absolute inset-0"
          />

          <div
            aria-hidden="true"
            className="storm-bolt pointer-events-none absolute right-20 top-16 h-32 w-16"
          />
        </>
      )}
      <section className="relative mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold">Weatherly</h1>
        <form className="mt-8 flex gap-3" onSubmit={handleSearch}>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white/85 backdrop-blur-sm px-4 py-3 shadow-sm outline-none"
            placeholder="Search for a city..."
            type="search"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setLocationOptions([]);
            }}
          />

          <button
            className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Loading..." : "Search"}
          </button>
        </form>
        {isSearchingLocations && (
          <p className="mt-3 text-sm text-slate-600">Searching locations...</p>
        )}
        {locationOptions.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm">
            <p className="px-4 py-3 text-sm font-medium text-slate-600">
              Choose a location
            </p>

            {locationOptions.map((location) => (
              <button
                className="flex w-full flex-col border-t border-slate-100 px-4 py-3 text-left hover:bg-sky-50"
                key={`${location.latitude}-${location.longitude}`}
                onClick={() => handleLocationSelect(location)}
                type="button"
              >
                <span className="font-medium text-slate-800">
                  {location.name}
                </span>
                <span className="text-sm text-slate-500">
                  {[location.admin1, location.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <article className="mt-6 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-sm">
          <p className="text-lg text-slate-500">{searchedCity}</p>

          <div className="mt-6 flex items-center gap-5">
            <span className="text-6xl">{weatherDetails.icon}</span>
            <p className="text-6xl font-light">
              {Math.round(weather.temperature)}°
            </p>
          </div>

          <p className="mt-4 text-slate-600">
            {weatherDetails.label} · Feels like {Math.round(weather.feelsLike)}°
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-slate-500">Humidity</p>
              <p className="mt-1 text-lg font-medium">{weather.humidity}%</p>
            </div>

            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-slate-500">Wind</p>
              <p className="mt-1 text-lg font-medium">
                {weather.windSpeed} mph
              </p>
            </div>
          </div>
        </article>
        <article className="mt-6 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Next 24 hours</h2>

          <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
            {weather.hourly.map((hour, index) => {
              const hourDetails = getWeatherDetails(hour.weatherCode);

              return (
                <div
                  className="w-16 shrink-0 rounded-2xl bg-sky-50 p-3 text-center"
                  key={hour.time}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {index === 0 ? "Now" : formatHour(hour.time)}
                  </p>

                  <p className="mt-3 text-2xl">{hourDetails.icon}</p>

                  <p className="mt-3 text-sm font-medium">
                    {Math.round(hour.temperature)}°
                  </p>
                </div>
              );
            })}
          </div>
        </article>
        <article className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">5-day forecast</h2>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {weather.forecast.map((day) => {
              const dayDetails = getWeatherDetails(day.weatherCode);

              return (
                <div
                  className="rounded-2xl bg-sky-50 p-3 text-center"
                  key={day.date}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {formatDay(day.date)}
                  </p>

                  <p className="mt-2 text-2xl">{dayDetails.icon}</p>

                  <p className="mt-2 text-sm font-medium">
                    {Math.round(day.high)}°
                  </p>

                  <p className="text-xs text-slate-500">
                    {Math.round(day.low)}°
                  </p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
