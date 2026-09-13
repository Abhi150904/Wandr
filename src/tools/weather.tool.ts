import { z } from "zod";

export const weatherToolInputSchema = z.object({
  city: z.string().trim().min(1, "city is required")
});

export const weatherReportSchema = z.object({
  city: z.string(),
  condition: z.string(),
  temperatureC: z.number(),
  humidityPercent: z.number().int().min(0).max(100),
  windKph: z.number(),
  packingAdvice: z.array(z.string()),
  source: z.literal("mock-mcp-weather")
});

export type WeatherToolInput = z.infer<typeof weatherToolInputSchema>;
export type WeatherReport = z.infer<typeof weatherReportSchema>;

const weatherProfiles = [
  {
    condition: "clear and warm",
    temperatureC: 29,
    humidityPercent: 42,
    windKph: 11,
    packingAdvice: ["Carry sunglasses.", "Use sunscreen.", "Keep a refillable water bottle."]
  },
  {
    condition: "mild with scattered clouds",
    temperatureC: 21,
    humidityPercent: 57,
    windKph: 14,
    packingAdvice: ["Pack a light jacket.", "Comfortable walking shoes should be enough."]
  },
  {
    condition: "cool with a chance of rain",
    temperatureC: 14,
    humidityPercent: 76,
    windKph: 18,
    packingAdvice: ["Carry a compact umbrella.", "Pack layers.", "Choose water-resistant shoes."]
  },
  {
    condition: "hot and dry",
    temperatureC: 34,
    humidityPercent: 28,
    windKph: 9,
    packingAdvice: ["Plan outdoor activities early.", "Wear breathable clothing.", "Prioritize hydration."]
  }
] as const;

const hashCity = (city: string): number =>
  [...city.toLowerCase()].reduce((hash, char) => hash + char.charCodeAt(0), 0);

export const getMockWeather = (input: WeatherToolInput): WeatherReport => {
  const parsedInput = weatherToolInputSchema.parse(input);
  const normalizedCity = parsedInput.city
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  const profileIndex = hashCity(normalizedCity) % weatherProfiles.length;
  const profile = weatherProfiles[profileIndex] ?? weatherProfiles[0];

  return weatherReportSchema.parse({
    city: normalizedCity,
    condition: profile.condition,
    temperatureC: profile.temperatureC,
    humidityPercent: profile.humidityPercent,
    windKph: profile.windKph,
    packingAdvice: [...profile.packingAdvice],
    source: "mock-mcp-weather"
  });
};
