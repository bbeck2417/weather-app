"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

type SavedLocation = {
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

type HourlyForecast = {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationChance: number;
  isDay: boolean;
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
  precipitationChance: number;
  latitude: number;
  longitude: number;
  isDay: boolean;
};

type ForecastDay = {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
  precipitationChance: number;
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
const SAVED_LOCATIONS_STORAGE_KEY = "weatherly-saved-locations";

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
    precipitationChance: 20,
    latitude: 39.7684,
    longitude: -86.1581,
    isDay: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingInitialLocation, setIsCheckingInitialLocation] =
    useState(true);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [hasSearchedLocations, setHasSearchedLocations] = useState(false);
  const [error, setError] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const hasCheckedLocationPermission = useRef(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isManagingSavedLocations, setIsManagingSavedLocations] =
    useState(false);

  const hasLoadedSavedLocations = useRef(false);

  useEffect(() => {
    const storedLocations = window.localStorage.getItem(
      SAVED_LOCATIONS_STORAGE_KEY,
    );

    let locations: SavedLocation[] = [];

    if (storedLocations) {
      try {
        const parsedLocations: unknown = JSON.parse(storedLocations);

        if (Array.isArray(parsedLocations)) {
          locations = parsedLocations as SavedLocation[];
        }
      } catch {
        // Ignore unreadable saved data and begin with an empty list.
      }
    }

    const frameId = window.requestAnimationFrame(() => {
      hasLoadedSavedLocations.current = true;
      setSavedLocations(locations);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedLocations.current) {
      return;
    }

    window.localStorage.setItem(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify(savedLocations),
    );
  }, [savedLocations]);
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

  const handleLocationSelect = useCallback(async (location: LocationOption) => {
    const locationLabel = location.admin1
      ? `${location.name}, ${location.admin1}`
      : location.name;

    setCity(locationLabel);
    setIsLocationSelected(true);
    setWeather((currentWeather) => ({
      ...currentWeather,
      locationName: locationLabel,
      latitude: location.latitude,
      longitude: location.longitude,
    }));

    setIsLoading(true);
    setError("");
    setLocationOptions([]);
    setHasSearchedLocations(false);

    try {
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto&hourly=temperature_2m,weather_code,precipitation_probability,is_day&forecast_hours=24`,
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to retrieve the weather.");
      }

      const weatherData = await weatherResponse.json();
      const currentHourIndex = weatherData.hourly.time.findIndex(
        (time: string) => time === weatherData.current.time,
      );

      setWeather({
        locationName: locationLabel,
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: weatherData.current.wind_speed_10m,
        weatherCode: weatherData.current.weather_code,
        isDay: weatherData.current.is_day === 1,
        precipitationChance:
          weatherData.hourly.precipitation_probability[
            currentHourIndex >= 0 ? currentHourIndex : 0
          ] ?? 0,
        forecast: weatherData.daily.time.map((date: string, index: number) => ({
          date,
          high: weatherData.daily.temperature_2m_max[index],
          low: weatherData.daily.temperature_2m_min[index],
          weatherCode: weatherData.daily.weather_code[index],
          precipitationChance:
            weatherData.daily.precipitation_probability_max[index] ?? 0,
        })),
        hourly: weatherData.hourly.time.map((time: string, index: number) => ({
          time,
          temperature: weatherData.hourly.temperature_2m[index],
          weatherCode: weatherData.hourly.weather_code[index],
          isDay: weatherData.hourly.is_day[index] === 1,
          precipitationChance:
            weatherData.hourly.precipitation_probability[index] ?? 0,
        })),
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
      setIsCheckingInitialLocation(false);
    }
  }, []);
  const isCurrentLocationSaved = savedLocations.some(
    (savedLocation) =>
      savedLocation.latitude === weather.latitude &&
      savedLocation.longitude === weather.longitude,
  );

  function handleToggleSavedLocation() {
    if (isCurrentLocationSaved) {
      setSavedLocations((currentLocations) =>
        currentLocations.filter(
          (savedLocation) =>
            savedLocation.latitude !== weather.latitude ||
            savedLocation.longitude !== weather.longitude,
        ),
      );
      return;
    }

    if (savedLocations.length >= 5) {
      setError(
        "You can save up to five locations. Remove one before adding another.",
      );
      return;
    }

    setSavedLocations((currentLocations) => [
      ...currentLocations,
      {
        name: weather.locationName,
        latitude: weather.latitude,
        longitude: weather.longitude,
      },
    ]);
  }
  function handleRemoveSavedLocation(locationToRemove: SavedLocation) {
    const remainingLocations = savedLocations.filter(
      (savedLocation) =>
        savedLocation.latitude !== locationToRemove.latitude ||
        savedLocation.longitude !== locationToRemove.longitude,
    );

    setSavedLocations(remainingLocations);

    if (remainingLocations.length === 0) {
      setIsManagingSavedLocations(false);
    }
  }
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setIsCheckingInitialLocation(false);
      setError("Your browser does not support location detection.");
      return;
    }

    setIsLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let locationName = "Current location";

        try {
          const response = await fetch(
            `/api/reverse-geocode?latitude=${latitude}&longitude=${longitude}`,
          );

          if (response.ok) {
            const data: { locationName?: string } = await response.json();

            if (data.locationName) {
              locationName = data.locationName;
            }
          }
        } catch {
          // Weather will still load with the fallback label.
        }

        void handleLocationSelect({
          name: locationName,
          latitude,
          longitude,
        });
      },
      (locationError) => {
        setIsCheckingInitialLocation(false);
        setIsLoading(false);

        if (locationError.code === 1) {
          setError(
            "Location access was not allowed. Search for a city instead.",
          );
          return;
        }

        setError(
          "Unable to determine your location. Search for a city instead.",
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      },
    );
  }, [handleLocationSelect]);

  useEffect(() => {
    if (hasCheckedLocationPermission.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      hasCheckedLocationPermission.current = true;
      handleUseMyLocation();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [handleUseMyLocation]);

  const weatherDetails = getWeatherDetails(weather.weatherCode, weather.isDay);
  const backgroundClass = getBackgroundClass(weather.weatherCode, weather.isDay);
  const isNight = !weather.isDay;
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
      {isClear && weather.isDay && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -right-20 -top-20 h-72 w-72 rounded-full bg-amber-200/80 blur-3xl"
        />
      )}
      {shouldShowCloudBank && (
        <div
          aria-hidden="true"
          className="cloud-bank pointer-events-none fixed right-0 top-0 h-[40rem] w-full opacity-100"
        />
      )}

      {isRainy && (
        <div
          aria-hidden="true"
          className="rain-overlay pointer-events-none fixed inset-0 opacity-25"
        />
      )}
      {shouldShowSnow && (
        <div
          aria-hidden="true"
          className="snow-flurries pointer-events-none fixed inset-0 opacity-75"
        />
      )}

      {shouldShowStorm && (
        <>
          <div
            aria-hidden="true"
            className="storm-cloud pointer-events-none fixed right-0 top-0 h-[40rem] w-full"
          />

          <div
            aria-hidden="true"
            className="storm-bolt pointer-events-none fixed right-20 top-16 h-32 w-16"
          />
        </>
      )}
      <section className="relative z-10 mx-auto max-w-xl">
        <h1
          className={`text-2xl font-semibold ${
            shouldShowStorm || isNight ? "text-white drop-shadow-sm" : "text-slate-600"
          }`}
        >
          Weatherly
        </h1>
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

        <button
          className="mt-3 text-sm font-medium text-slate-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleUseMyLocation}
          type="button"
        >
          Use my location
        </button>
        {savedLocations.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-600">
                Saved locations
              </h2>

              <button
                className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
                onClick={() =>
                  setIsManagingSavedLocations((current) => !current)
                }
                type="button"
              >
                {isManagingSavedLocations ? "Done" : "Manage"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {savedLocations.map((savedLocation) => (
                <div
                  className="relative"
                  key={`${savedLocation.latitude}-${savedLocation.longitude}`}
                >
                  <button
                    className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-sky-50"
                    onClick={() => handleLocationSelect(savedLocation)}
                    type="button"
                  >
                    {savedLocation.name}
                  </button>

                  {isManagingSavedLocations && (
                    <button
                      aria-label={`Remove ${savedLocation.name}`}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-sm text-white shadow-sm hover:bg-slate-700"
                      onClick={() => handleRemoveSavedLocation(savedLocation)}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
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
        {isCheckingInitialLocation ? (
          <div className="mt-6 rounded-3xl bg-white/80 p-8 shadow-sm">
            <p className="text-sm text-slate-500">Detecting your location...</p>
          </div>
        ) : (
          <>
            <article
              key={`${weather.locationName}-${weather.temperature}`}
              className="mt-6 rounded-3xl bg-white/90 p-8 shadow-sm md:bg-white/80 md:backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg text-slate-500">{weather.locationName}</p>

                <button
                  aria-label={
                    isCurrentLocationSaved
                      ? `Remove ${weather.locationName} from saved locations`
                      : `Save ${weather.locationName}`
                  }
                  className="rounded-full px-2 py-1 text-2xl text-amber-500 transition hover:bg-amber-50"
                  onClick={handleToggleSavedLocation}
                  title={
                    isCurrentLocationSaved
                      ? "Remove from saved locations"
                      : "Save location"
                  }
                  type="button"
                >
                  {isCurrentLocationSaved ? "★" : "☆"}
                </button>
              </div>

              <div className="mt-6 flex items-center gap-5">
                <span className="text-6xl">{weatherDetails.icon}</span>

                <p className="text-6xl font-light">
                  {Math.round(weather.temperature)}°
                </p>
              </div>

              <p className="mt-4 text-slate-600">
                {weatherDetails.label} · Feels like{" "}
                {Math.round(weather.feelsLike)}° 💧{" "}
                {weather.precipitationChance}%
              </p>

              <p className="text-xs text-slate-500"></p>
              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-slate-500">Humidity</p>
                  <p className="mt-1 text-lg font-medium">
                    {weather.humidity}%
                  </p>
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
                  const hourDetails = getWeatherDetails(hour.weatherCode, hour.isDay);

                  return (
                    <div
                      className="w-16 shrink-0 rounded-2xl bg-sky-50 p-3 text-center"
                      key={hour.time}
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {index === 0 ? "Now" : formatHour(hour.time)}
                      </p>

                      <p className="mt-3 text-2xl">{hourDetails.icon}</p>
                      <p className="text-xs text-slate-500">
                        💧 {hour.precipitationChance}%
                      </p>
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
                      <p className="text-xs text-slate-500">
                        💧 {day.precipitationChance}%
                      </p>

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
          </>
        )}
      </section>
    </main>
  );
}
