import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const serverEnvironmentSchema = z.object({
  DATABASE_URL: optionalUrl,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
});

const clientEnvironmentSchema = z.object({
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: optionalString,
});

export const env = {
  server: serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  }),
  client: clientEnvironmentSchema.parse({
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  }),
};
