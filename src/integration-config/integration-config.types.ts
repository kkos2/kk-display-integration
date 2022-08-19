import { z } from "zod";

export const displayApiCredentials = z.object({
  email: z.string(),
  password: z.string(),
});

export const IntegrationConfiguration = z.object({
  displayApiEndpoint: z.string(),
  displayApiCredentials: displayApiCredentials,
});

export type IntegrationConfiguration = z.infer<typeof IntegrationConfiguration>;
export type displayApiCredentials = z.infer<typeof displayApiCredentials>;
