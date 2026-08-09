"use client";

import { useState, useEffect } from "react";
import {
  formatHour,
  getBackgroundClass,
  getWeatherDetails,
  isSnowy,
  isStormy,
} from "@/lib/weather";
import { normalizeUsState } from "@/lib/locations";

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
  locationName: string;
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

type ZipCodeResponse = {
  country: string;
  places: Array<{
    "place name": string;
    state: string;
    latitude: string;
    longitude: string;
  }>;
};

function parseLocationQuery(searchTerm: string) {
  const [city, region] = searchTerm.split(",").map((part) => part.trim());

  return {
    city,
    region: region || undefined,
  };
}
export default function Home() {
  const [city, setCity] = useState("");

  const [weather, setWeather] = useState<WeatherData>({
    temperature: 74,
    feelsLike: 72,
    humidity: 45,
    windSpeed: 9,
    weatherCode: 0,
    forecast: [],
    hourly: [],
    locationName: "Indianapolis",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [hasSearchedLocations, setHasSearchedLocations] = useState(false);
  const [error, setError] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [isLocationSelected, setIsLocationSelected] = useState(false);

  useEffect(() => {
    const searchTerm = city.trim();

    if (isLocationSelected || searchTerm.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingLocations(true);
      setError("");

      try {
        if (/^\d{5}$/.test(searchTerm)) {
          const zipResponse = await fetch(
            `https://api.zippopotam.us/us/${searchTerm}`,
            { signal: controller.signal },
          );

          if (zipResponse.status === 404) {
            setLocationOptions([]);
            setHasSearchedLocations(true);
            return;
          }

          if (!zipResponse.ok) {
            throw new Error("Unable to search for that ZIP code.");
          }

          const zipData: ZipCodeResponse = await zipResponse.json();

          setLocationOptions(
            zipData.places.map((place) => ({
              name: place["place name"],
              admin1: place.state,
              country: zipData.country,
              latitude: Number(place.latitude),
              longitude: Number(place.longitude),
            })),
          );
          setHasSearchedLocations(true);
          return;
        }

        const { city: cityName, region } = parseLocationQuery(searchTerm);
        const stateName = normalizeUsState(region);

        const locationResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`,
          { signal: controller.signal },
        );

        if (!locationResponse.ok) {
          throw new Error("Unable to search for locations.");
        }

        const locationData = await locationResponse.json();
        const locations: LocationOption[] = locationData.results ?? [];

        const filteredLocations = stateName
          ? locations.filter(
              (location) =>
                location.admin1?.toLowerCase() === stateName.toLowerCase(),
            )
          : locations;

        setLocationOptions(filteredLocations);
        setHasSearchedLocations(true);
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
  }, [city, isLocationSelected]);

  async function handleLocationSelect(location: LocationOption) {
    const locationLabel = location.admin1
      ? `${location.name}, ${location.admin1}`
      : location.name;

    setCity(locationLabel);
    setIsLocationSelected(true);
    setWeather((currentWeather) => ({
      ...currentWeather,
      locationName: locationLabel,
    }));

    setIsLoading(true);
    setError("");
    setLocationOptions([]);
    setHasSearchedLocations(false);

    try {
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto&hourly=temperature_2m,weather_code&forecast_hours=24`,
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to retrieve the weather.");
      }

      const weatherData = await weatherResponse.json();

      setWeather({
        locationName: locationLabel,
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
  const shouldShowCloudBank = isCloudy || isRainy;
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
      {shouldShowCloudBank && (
        <div
          aria-hidden="true"
          className="cloud-bank pointer-events-none absolute right-0 top-0 h-[40rem] w-full opacity-100"
        />
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
        <div className="mt-8">
          <label className="sr-only" htmlFor="city-search">
            Search for a city
          </label>

          <input
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm outline-none md:bg-white/85 md:backdrop-blur-sm"
            id="city-search"
            placeholder="Search city, state, or ZIP code..."
            type="search"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setIsLocationSelected(false);
              setLocationOptions([]);
              setHasSearchedLocations(false);
            }}
          />
        </div>
        {isLoading && (
          <p className="mt-3 text-sm text-slate-600">Loading weather...</p>
        )}
        {isSearchingLocations && (
          <p className="mt-3 text-sm text-slate-600">Searching locations...</p>
        )}
        {hasSearchedLocations &&
          !isSearchingLocations &&
          locationOptions.length === 0 &&
          !error && (
            <p className="mt-3 text-sm text-slate-600">
              No locations found. Try a city and state, or a ZIP code.
            </p>
          )}
        {locationOptions.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm md:bg-white/90 md:backdrop-blur-sm">
            <p className="px-4 py-3 text-sm font-medium text-slate-600">
              Choose a location
            </p>
            {locationOptions.length === 10 && (
              <p className="px-4 pb-3 text-sm text-slate-500">
                Showing the top 10 matches. Add a state or country to refine
                your search.
              </p>
            )}
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
        <article className="mt-6 rounded-3xl bg-white/90 p-8 shadow-sm md:bg-white/80 md:backdrop-blur-sm">
          <p className="text-lg text-slate-500">{weather.locationName}</p>

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
        <article className="mt-6 rounded-3xl bg-white/90 p-6 shadow-sm md:bg-white/80 md:backdrop-blur-sm">
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
