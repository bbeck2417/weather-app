"use client";

import { useState } from "react";

type WeatherData = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  forecast: ForecastDay[];
};

type ForecastDay = {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
};

function getWeatherDetails(weatherCode: number) {
  if (weatherCode === 0) {
    return { icon: "☀️", label: "Clear" };
  }

  if ([1, 2].includes(weatherCode)) {
    return { icon: "🌤️", label: "Partly cloudy" };
  }

  if (weatherCode === 3) {
    return { icon: "☁️", label: "Overcast" };
  }

  if ([45, 48].includes(weatherCode)) {
    return { icon: "🌫️", label: "Foggy" };
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return { icon: "🌦️", label: "Drizzle" };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return { icon: "🌧️", label: "Rain" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return { icon: "❄️", label: "Snow" };
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return { icon: "⛈️", label: "Thunderstorm" };
  }

  return { icon: "🌡️", label: "Unknown" };
}
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
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`,
      );

      if (!locationResponse.ok) {
        throw new Error("Unable to search for that city.");
      }

      const locationData = await locationResponse.json();
      const location = locationData.results?.[0];

      if (!location) {
        throw new Error("City not found. Try another search.");
      }

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&temperature_unit=fahrenheit&wind_speed_unit=mph&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`,
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to retrieve the weather.");
      }

      const weatherData = await weatherResponse.json();

      setSearchedCity(
        location.admin1
          ? `${location.name}, ${location.admin1}`
          : location.name,
      );

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
  return (
    <main className="min-h-screen bg-sky-50 px-6 py-12 text-slate-600">
      <section>
        <h1 className="text-2xl font-semibold">Weatherly</h1>
        <form className="mt-8 flex gap-3" onSubmit={handleSearch}>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none"
            placeholder="Search for a city..."
            type="search"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />

          <button
            className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Loading..." : "Search"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <article className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-lg text-slate-500">{searchedCity}</p>

          <div className="mt-6 flex items-center gap-5">
            <span className="text-6xl">{weatherDetails.icon}</span>
            <p className="text-6xl font-light">{weather.temperature}°</p>
          </div>

          <p className="mt-4 text-slate-600">
            {weatherDetails.label} · Feels like {weather.feelsLike}°
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
