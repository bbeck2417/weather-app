import { describe, expect, it } from "vitest";

import {
  formatHour,
  getBackgroundClass,
  getWeatherDetails,
  isSnowy,
  isStormy,
} from "./weather";

describe("getWeatherDetails", () => {
  it("returns clear weather details for code 0", () => {
    expect(getWeatherDetails(0)).toEqual({
      icon: "☀️",
      label: "Clear",
    });
  });

  it("returns rain weather details for code 63", () => {
    expect(getWeatherDetails(63)).toEqual({
      icon: "🌧️",
      label: "Rain",
    });
  });

  it("returns snow weather details for code 73", () => {
    expect(getWeatherDetails(73)).toEqual({
      icon: "❄️",
      label: "Snow",
    });
  });

  it("returns thunderstorm details for code 95", () => {
    expect(getWeatherDetails(95)).toEqual({
      icon: "⛈️",
      label: "Thunderstorm",
    });
  });

  it("returns unknown details for an unsupported code", () => {
    expect(getWeatherDetails(999)).toEqual({
      icon: "🌡️",
      label: "Unknown",
    });
  });

  it("uses a rain-only icon for nighttime drizzle", () => {
    expect(getWeatherDetails(51, false)).toEqual({
      icon: "🌧️",
      label: "Drizzle",
    });
  });
});

describe("weather background helpers", () => {
  it("uses a dark background for thunderstorms", () => {
    expect(getBackgroundClass(95)).toContain("from-slate-600");
  });

  it("identifies snow and thunderstorm codes", () => {
    expect(isSnowy(73)).toBe(true);
    expect(isSnowy(63)).toBe(false);
    expect(isStormy(95)).toBe(true);
    expect(isStormy(0)).toBe(false);
  });
});

describe("formatHour", () => {
  it("formats midnight, noon, and late-night hours", () => {
    expect(formatHour("2026-08-08T00:00")).toBe("12 AM");
    expect(formatHour("2026-08-08T12:00")).toBe("12 PM");
    expect(formatHour("2026-08-08T23:00")).toBe("11 PM");
  });
});
