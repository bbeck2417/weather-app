import { describe, expect, it } from "vitest";

import { normalizeUsState } from "./locations";

describe("normalizeUsState", () => {
  it("converts a state abbreviation to its full name", () => {
    expect(normalizeUsState("IN")).toBe("Indiana");
    expect(normalizeUsState("ca")).toBe("California");
  });

  it("preserves a full state name", () => {
    expect(normalizeUsState("Kentucky")).toBe("Kentucky");
  });

  it("returns undefined when no region is provided", () => {
    expect(normalizeUsState()).toBeUndefined();
  });
});
