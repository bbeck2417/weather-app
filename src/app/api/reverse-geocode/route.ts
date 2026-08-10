import { NextRequest, NextResponse } from "next/server";

type GeoapifyResponse = {
  results?: Array<{
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  }>;
};

export async function GET(request: NextRequest) {
  const latitudeParam = request.nextUrl.searchParams.get("latitude");
  const longitudeParam = request.nextUrl.searchParams.get("longitude");

  const latitude = Number(latitudeParam);
  const longitude = Number(longitudeParam);

  if (
    !latitudeParam ||
    !longitudeParam ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Location service is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to look up your location." },
      { status: 502 },
    );
  }

  const data: GeoapifyResponse = await response.json();
  const location = data.results?.[0];

  const city =
    location?.city ?? location?.town ?? location?.village ?? location?.county;

  const region = location?.state ?? location?.country;

  const locationName =
    [city, region].filter(Boolean).join(", ") || "Current location";

  return NextResponse.json({ locationName });
}
