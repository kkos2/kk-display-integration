import { Injectable, Logger } from "@nestjs/common";
import {
  AuthenticationApi,
  Configuration,
  PlaylistPlaylistJsonld,
  PlaylistsApi,
  PutV1PlaylistSlideIdRequestInner,
  ScreensApi,
  ScreenScreenJsonld,
  SlidesApi,
  SlideSlideInput,
  SlideSlideJsonld,
  TemplatesApi,
  Token,
} from "../display-api-client";
import { Agent } from "https";
import jwtDecode, { JwtPayload } from "jwt-decode";
import { CreateSlideInput, PlaylistSlide, PlaylistSlideResult, Slide } from "./types";
import { IntegrationConfigService } from "../integration-config/integration-config.service";

@Injectable()
export class DisplayApiService {
  constructor(private readonly logger: Logger, private readonly config: IntegrationConfigService) {}

  configuration = new Configuration({
    basePath: this.config.displayApiEndpoint,
    baseOptions: {
      // Axios won't accept our mkcert certs for now - so lets just disable
      // cert verification.
      httpsAgent: new Agent({
        rejectUnauthorized: false,
      }),
    },
  });

  /**
   * Save admin token, to reduce token generations if we still have an
   * unexpired token.
   */
  public adminToken: Token = {};

  /**
   * Get admin token used for making requests.
   */
  async getAdminToken(): Promise<Token> {
    if (this?.adminToken.token) {
      const decoded = jwtDecode<JwtPayload>(this.adminToken.token);
      if (decoded.exp && decoded.exp > Date.now() / 1000 + 60) {
        return this.adminToken;
      }
    }

    const authentication = new AuthenticationApi(this.configuration);
    const response = await authentication.postCredentialsItem(this.config.displayApiCredentials);
    this.adminToken = response.data;
    return this.adminToken;
  }

  /**
   * Get the display client config for making requests
   */
  async getAuthenticatedConfig(): Promise<Configuration> {
    const configWithAuth = { ...this.configuration } as Configuration;
    const tokenData = await this.getAdminToken();

    configWithAuth.accessToken = tokenData.token;

    return configWithAuth;
  }

  /**
   * Get the template id for a template with a specific title.
   *
   * @param title The title of the template to fetch the id for.
   */
  async getTemplateId(title: string): Promise<string | void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const templatesApi = new TemplatesApi(config);
      const response = await templatesApi.getV1Templates(1, "1", title);
      // TODO - figure out why this is not typed.
      const data = response.data as any;
      if (data["hydra:member"].length === 1) {
        return data["hydra:member"][0]["@id"];
      }
    } catch (error) {
      this.logger.error("Error fetching template id for title: " + title, (error as Error).message);
    }
  }

  /**
   * Fetch the slides of single type.
   *
   * Note it is currently not possible to get the slides of a given type
   * (template) so we need to fetch all slides and then manually filter the
   * slides.
   *
   * @param {string} type the type of slide to fetch
   */
  async fetchSlides(type: string): Promise<Array<Slide>> {
    const templateId = await this.getTemplateId(type);
    const slides: any[] = [];
    if (!templateId) {
      return slides;
    }

    try {
      const config = await this.getAuthenticatedConfig();
      const slideApi = new SlidesApi(config);
      let page = 1;
      // The page size doesn't matter, as we will loop through all pages.
      const itemsPerPage = "24";
      let fetch = true;
      while (fetch) {
        const response = await slideApi.getV1Slides(page, itemsPerPage);
        // TODO, figure out how to avoid any.
        const data = response.data as any;
        data["hydra:member"].forEach((slide: any) => {
          if (slide.templateInfo["@id"] === templateId) {
            slides.push(slide);
          }
        });
        if (data["hydra:member"].length < itemsPerPage) {
          fetch = false;
        } else {
          page += 1;
        }
      }
    } catch (error) {
      this.logger.error("Error fetching slides", (error as Error).message);
    }

    return slides;
  }

  async updateSlide(id: string, slideData: SlideSlideInput): Promise<void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const slideApi = new SlidesApi(config);

      await slideApi.putV1SlideId(id, slideData);
    } catch (error) {
      this.logger.error(
        "Error updating slide with id: " + id,
        JSON.stringify(slideData),
        (error as Error).message
      );
    }
  }

  /**
   * Fetches all screens.
   */
  async fetchScreens(): Promise<ScreenScreenJsonld[]> {
    try {
      const config = await this.getAuthenticatedConfig();
      const screensApi = new ScreensApi(config);
      const screens: ScreenScreenJsonld[] = [];

      let page = 1;
      // The page size doesn't matter, as we will loop through all pages.
      const itemsPerPage = "24";
      let fetch = true;
      while (fetch) {
        const response = await screensApi.getV1Screens(page, itemsPerPage);
        // TODO, figure out how to avoid any.
        const data = response.data as any;
        data["hydra:member"].forEach((screen: ScreenScreenJsonld) => {
          screens.push(screen);
        });
        if (data["hydra:member"].length < itemsPerPage) {
          fetch = false;
        } else {
          page += 1;
        }
      }

      return screens;
    } catch (error) {
      this.logger.error("Error fetching screens", (error as Error).message);
    }

    return [];
  }

  /**
   * Gets a playlist by name.
   *
   * @param {string} name the name of the playlist to get
   */
  async getPlaylistByName(name: string): Promise<PlaylistPlaylistJsonld | null> {
    try {
      const config = await this.getAuthenticatedConfig();
      const playlistsApi = new PlaylistsApi(config);

      const response = await playlistsApi.getV1Playlists(1, 1, name);
      const data = response.data as any;
      const playlist = data["hydra:member"].shift();
      if (playlist && playlist["@id"]) {
        return playlist;
      }
    } catch (error) {
      this.logger.error(`Error getting playlist with name "${name}"`, (error as Error).message);
    }

    return null;
  }

  /**
   * Gets the slides in a given playlist.
   *
   * @param {string} playlistId the ID of the playlist to get slides for
   */
  async getPlaylistSlides(playlistId: string): Promise<PlaylistSlide[]> {
    const config = await this.getAuthenticatedConfig();
    const playlistsApi = new PlaylistsApi(config);
    const slides: PlaylistSlide[] = [];

    let page = 1;
    // The page size doesn't matter, as we will loop through all pages.
    const itemsPerPage = "24";
    let fetch = true;
    while (fetch) {
      const response = await playlistsApi.getV1PlaylistSlideId(playlistId, page, itemsPerPage);
      // TODO, figure out how to avoid any.
      const data = response.data as any;
      data["hydra:member"].forEach((member: PlaylistSlideResult) => {
        slides.push({
          slide: member.slide,
          content: member.slide.content,
          "@id": member.slide["@id"],
          weight: member.weight || 0,
        });
      });
      if (data["hydra:member"].length < itemsPerPage) {
        fetch = false;
      } else {
        page += 1;
      }
    }

    return slides;
  }

  /**
   * Saves slides on a playlist.
   *
   * @param {string} playlistId the ID of the playlist to update
   * @param {PutV1PlaylistSlideIdRequestInner[]} slides the slides to save on the playlist
   */
  async savePlaylistSlides(
    playlistId: string,
    slides: PutV1PlaylistSlideIdRequestInner[]
  ): Promise<void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const playlistsApi = new PlaylistsApi(config);

      await playlistsApi.putV1PlaylistSlideId(playlistId, slides);
    } catch (error) {
      this.logger.error(
        `Error saving Playlist slides for playlist ${playlistId}`,
        (error as Error).message
      );
    }
  }

  /**
   * Creates a new slide.
   *
   * @param {SlideSlideJsonld} data the slide data
   */
  async createSlide(data: CreateSlideInput): Promise<SlideSlideJsonld | null> {
    try {
      const config = await this.getAuthenticatedConfig();
      const slidesApi = new SlidesApi(config);
      const response = await slidesApi.createV1Slides(data as any);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error creating slide with data ${JSON.stringify(data)}`,
        (error as Error).message
      );
    }

    return null;
  }

  /**
   * Deletes a slide.
   *
   * @param {string} slideId the slide ID
   */
  async deleteSlide(slideId: string): Promise<void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const slidesApi = new SlidesApi(config);
      await slidesApi.deleteV1SlideId(slideId);
    } catch (error) {
      this.logger.error(`Error deleting slide ${slideId}`, (error as Error).message);
    }
  }
}
