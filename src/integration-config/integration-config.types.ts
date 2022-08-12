import { z } from "zod";

export const IntegrationConfiguration = z.object({
  displayApiEndpoint: z.string(),
});

export type IntegrationConfiguration = z.infer<typeof IntegrationConfiguration>;
