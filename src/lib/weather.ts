export function getWeatherDetails(weatherCode: number) {
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

export function getBackgroundClass(weatherCode: number) {
  if (weatherCode === 0) {
    return "bg-gradient-to-b from-sky-300 via-sky-100 to-white";
  }

  if ([1, 2].includes(weatherCode)) {
    return "bg-gradient-to-b from-sky-200 via-slate-100 to-white";
  }

  if ([3, 45, 48].includes(weatherCode)) {
    return "bg-gradient-to-b from-slate-300 via-slate-100 to-white";
  }

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
  ) {
    return "bg-gradient-to-b from-slate-400 via-sky-200 to-slate-50";
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return "bg-gradient-to-b from-sky-100 via-white to-blue-50";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "bg-gradient-to-b from-slate-600 via-indigo-300 to-slate-100";
  }

  return "bg-sky-50";
}

const SNOW_CODES = [71, 73, 75, 77, 85, 86];
const STORM_CODES = [95, 96, 99];

export function isSnowy(weatherCode: number) {
  return SNOW_CODES.includes(weatherCode);
}

export function isStormy(weatherCode: number) {
  return STORM_CODES.includes(weatherCode);
}
export function formatHour(time: string) {
  const hour = Number(time.slice(11, 13));
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  return `${displayHour} ${period}`;
}