import { SlideSlide } from "../display-api-client";

/**
 * Create custom slide interface to fix issue with content being listed as
 * string[].
 */
export interface Slide extends Omit<SlideSlide, "content"> {
  content: any;
  "@id": string;
}
