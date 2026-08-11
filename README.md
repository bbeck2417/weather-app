# Weatherly

A responsive weather dashboard that delivers current conditions, a 24-hour outlook, and a five-day forecast for locations around the world. Weatherly pairs live data with weather-aware visual scenes, location detection, saved locations, and installable PWA support.

**[View the live app](https://weather-app-kappa-ivory-64.vercel.app/)** · **[View the repository](https://github.com/bbeck2417/weather-app)**

## Preview

Weatherly adapts its background treatment to conditions such as clear skies, clouds, rain, snow, and thunderstorms while keeping forecast information readable and accessible.

## Features

- Search for a city, U.S. state, state abbreviation, or ZIP code.
- Use the browser’s location permission to load weather for the user’s current location.
- Reverse-geocode coordinates into a human-readable location name.
- Display current temperature, feels-like temperature, humidity, wind speed, and precipitation chance.
- Show a 24-hour forecast and five-day forecast with precipitation probabilities.
- Save up to five locations in the browser with local storage and manage them from the interface.
- Use weather-responsive backgrounds with custom cloud, rain, snow, and thunderstorm artwork.
- Install the app on desktop or mobile as a Progressive Web App.
- Run automated linting, unit tests, and production builds through GitHub Actions.

## Built With

- [Next.js](https://nextjs.org/) 16 and [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo](https://open-meteo.com/) for forecast and geocoding data
- [Geoapify](https://www.geoapify.com/) for reverse geocoding
- [Vitest](https://vitest.dev/) for unit tests
- [Vercel](https://vercel.com/) for deployment

## Local Development

### Prerequisites

- Node.js 22 or later
- A Geoapify API key for location-name lookup

### Install and run

```bash
git clone https://github.com/bbeck2417/weather-app.git
cd weather-app
npm install
```

Create a `.env.local` file in the project root:

```bash
GEOAPIFY_API_KEY=your_geoapify_api_key
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev    # Start the development server
npm run lint   # Check code quality with ESLint
npm test       # Run Vitest unit tests
npm run build  # Create a production build
npm run start  # Serve the production build
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEOAPIFY_API_KEY` | Yes | Enables the server-side reverse-geocoding route used for the current-location label. |

The API key is read only on the server by `src/app/api/reverse-geocode/route.ts`. Do not commit `.env.local` or expose this key in client-side code.

## Project Structure

```text
src/
├── app/
│   ├── api/reverse-geocode/  # Server-side Geoapify reverse-geocoding route
│   ├── globals.css           # Weather-scene styles
│   ├── manifest.ts           # PWA manifest
│   └── page.tsx              # Weatherly user interface and data flow
└── lib/
    ├── locations.ts          # Location helpers
    └── weather.ts            # Weather-code and display helpers
public/
├── weather/                  # Custom weather-scene artwork
└── icon-*.png                # PWA icons
```

## Quality Checks and Deployment

GitHub Actions runs `npm run lint`, `npm test`, and `npm run build` for pushes and pull requests targeting `main`. The app is deployed on Vercel; configure `GEOAPIFY_API_KEY` as a sensitive environment variable in the Vercel project settings for production location detection.

## Future Improvements

- Add a searchable location-results keyboard experience.
- Cache recent forecasts for an offline-friendly PWA experience.
- Add hourly conditions such as wind gusts and UV index.
- Let users choose Celsius or Fahrenheit.

## Author

Built by [Billy Beck](https://github.com/bbeck2417).
