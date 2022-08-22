import { PlaylistSlidePlaylistSlideJsonld, SlideSlide } from "../display-api-client";

/**
 * Create custom slide interface to fix issue with content being listed as
 * string[].
 */
export interface Slide extends Omit<SlideSlide, "content"> {
  content: any;
  "@id": string;
}

export interface PlaylistSlide extends Slide {
  weight: number;
}

export interface PlaylistSlideResult extends Omit<PlaylistSlidePlaylistSlideJsonld, "slide"> {
  slide: Slide;
}

/**
 * Create custom slide interface to fix issue with content being listed as
 * string[].
 */
export interface Slide extends Omit<SlideSlide, "content"> {
  content: any;
  "@id": string;
}

export type CreateSlideInput = {
  title: string;
  content: Record<string, string>;
  templateInfo: {
    "@id": string;
  };
};
