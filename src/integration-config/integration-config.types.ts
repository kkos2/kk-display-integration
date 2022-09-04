import { z } from "zod";

export const displayApiCredentials = z.object({
  email: z.string(),
  password: z.string(),
});

export const basicAuthCredentials = z.object({
  username: z.string(),
  password: z.string(),
});

export const IntegrationConfiguration = z.object({
  displayApiEndpoint: z.string(),
  displayApiCredentials: displayApiCredentials,
  basicAuthCredentials: basicAuthCredentials,
});

export type IntegrationConfiguration = z.infer<typeof IntegrationConfiguration>;
export type displayApiCredentials = z.infer<typeof displayApiCredentials>;
export type basicAuthCredentials = z.infer<typeof basicAuthCredentials>;
