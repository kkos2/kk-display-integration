import { Injectable, Logger } from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import { PlaylistPlaylistJsonld, PutV1PlaylistSlideIdRequestInner } from "../display-api-client";
import { NemdelingSlide } from "./types";
import { PlaylistSlide } from "../display-api/types";
import { format } from "date-fns";
import daLocale from "date-fns/locale/da";

@Injectable()
export class NemDelingService {
  constructor(
    private readonly displayApiService: DisplayApiService,
    private readonly logger: Logger
  ) {}

  /**
   * If service messages are syncing.
   *
   * 0 means that no sync is in progress.
   * A value greater than 0 means that syncing is in progress, the number is the
   * number og requests that has been skipped.
   */
  public serviceMessagesAreSyncing = 0;

  /**
   * If events are syncing.
   *
   * 0 means that no sync is in progress.
   * A value greater than 0 means that syncing is in progress, the number is the
   * number og requests that has been skipped.
   */
  public eventsAreSyncing = 0;

  /**
   * If event lists are syncing.
   *
   * 0 means that no sync is in progress.
   * A value greater than 0 means that syncing is in progress, the number is the
   * number of requests that has been skipped.
   */
  public eventListsAreSyncing = 0;

  /**
   * If event themes are syncing.
   *
   * 0 means that no sync is in progress.
   * A value greater than 0 means that syncing is in progress, the number is the
   * number og requests that has been skipped.
   */
  public eventThemesAreSyncing = 0;

  /**
   * Gets a service message playlist from a given screen name.
   *
   * @param {string} screenName the name of the screen to get the playlist for.
   */
  async getServiceMessagePlaylistFromScreenName(
    screenName: string
  ): Promise<PlaylistPlaylistJsonld | null> {
    const playlistName = `service_message_${screenName}`;
    return await this.displayApiService.getPlaylistByName(playlistName);
  }

  /**
   * Gets an event playlist from a given screen name.
   *
   * @param {string} screenName the name of the screen to get the playlist for.
   */
  async getEventPlaylistFromScreenName(screenName: string): Promise<PlaylistPlaylistJsonld | null> {
    const playlistName = `event_${screenName}`;
    return await this.displayApiService.getPlaylistByName(playlistName);
  }

  /**
   * Gets an event list playlist from a given screen name.
   *
   * @param {string} screenName the name of the screen to get the playlist for.
   */
  async getEventListPlaylistFromScreenName(
    screenName: string
  ): Promise<PlaylistPlaylistJsonld | null> {
    const playlistName = `event_list_${screenName}`;
    return await this.displayApiService.getPlaylistByName(playlistName);
  }

  /**
   * Gets an event theme playlist from a given screen name.
   *
   * @param {string} screenName the name of the screen to get the playlist for.
   */
  async getEventThemePlaylistFromScreenName(
    screenName: string
  ): Promise<PlaylistPlaylistJsonld | null> {
    const playlistName = `event_theme_${screenName}`;
    return await this.displayApiService.getPlaylistByName(playlistName);
  }

  /**
   * Gets a KK Bib playlist from a given screen name.
   *
   * Note, right now bib is not handled through nemdeling but with a custom XML
   * endpoint we fetch ourselves (see kk-bib module). While this doesn't really
   * belong here, in the future we expect this to be moved to nemdling. So
   * instead of moving a lot of code around, we have this function here to make
   * the code simpler to write and maintain.
   *
   * @param {string} screenName the name of the screen to get the playlist for.
   */
  async getKkBibPlaylistFromScreenName(screenName: string): Promise<PlaylistPlaylistJsonld | null> {
    const playlistName = `kk_bib_${screenName}`;
    return await this.displayApiService.getPlaylistByName(playlistName);
  }

  /**
   * Create slide if it doesn't already exist
   *
   * @param {NemdelingSlide} slide - The slide as it should exist.
   * @param {number} weight - The weight the slide should have on the playlist.
   * @param {PlaylistSlide[]} playlistSlides - The list of existing slides on playlist.
   */
  ensureSlideOnPlaylist(
    slide: NemdelingSlide,
    weight: number,
    playlistSlides: PlaylistSlide[]
  ): Promise<PutV1PlaylistSlideIdRequestInner> {
    const logger = this.logger;
    return new Promise((resolve, reject) => {
      // If slide is existing, weight may need to be updated, but that is done later.
      const existingSlide = playlistSlides.find((item) => {
        if (!slide.content.externalId) {
          return JSON.stringify(slide.content) === JSON.stringify(item.content);
        }
        return slide.content.externalId === item.content.externalId;
      });
      if (existingSlide) {
        const existingSlideId = existingSlide["@id"].replace("/v1/slides/", "");
        if (JSON.stringify(slide.content) === JSON.stringify(existingSlide.content)) {
          resolve({
            slide: existingSlideId,
            weight: weight,
          });
        }
        // Content has changed, we need to update the existing slide.
        else {
          this.displayApiService
            .updateSlide(existingSlideId, {
              ...existingSlide.slide,
              templateInfo: {
                "@id": slide.templateId,
              },
              content: slide.content,
            })
            .then(() => {
              resolve({
                slide: existingSlideId,
                weight: weight,
              });
            })
            .catch((err) => {
              reject(err);
              logger.error("Error update slide with id: " + existingSlide.slide);
            });
        }
      }
      // Create slide if it doesn't exist.
      else {
        this.displayApiService
          .createSlide({
            title: `NemDeling slide - ${weight + 1}`,
            templateInfo: {
              "@id": slide.templateId,
            },
            content: slide.content,
          })
          .then((newSlide) => {
            if (newSlide && newSlide["@id"]) {
              resolve({
                slide: newSlide["@id"].replace("/v1/slides/", ""),
                weight: weight,
              });
            }
            reject(null);
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  }

  /**
   * Synchronizes slides on a playlist.
   *
   * @param {PlaylistPlaylistJsonld} playlist the playlist to sync the slides to
   * @param {NemdelingSlide[]} slides the slides to add to the playlist
   */
  async syncPlaylist(playlist: PlaylistPlaylistJsonld, slides: NemdelingSlide[]): Promise<boolean> {
    if (!playlist["@id"]) {
      return false;
    }

    const playlistId = playlist["@id"].replace("/v1/playlists/", "");
    let playlistSlides: PlaylistSlide[] = [];
    try {
      playlistSlides = await this.displayApiService.getPlaylistSlides(playlistId);
    } catch (error) {
      this.logger.error(
        `Error fetching slides from playlist with id: "${playlist["@id"]}"`,
        (error as Error).message
      );
      return false;
    }

    try {
      const promises = slides.map((slide, index) =>
        this.ensureSlideOnPlaylist(slide, index, playlistSlides)
      );
      const newSlides = await Promise.all(promises);
      // Delete slides which doesn't exist in the new list.
      playlistSlides.forEach((oldSlide) => {
        if (
          newSlides.filter(
            (newSlide) => newSlide.slide === oldSlide["@id"].replace("/v1/slides/", "")
          ).length === 0
        ) {
          void this.displayApiService.deleteSlide(oldSlide["@id"].replace("/v1/slides/", ""));
        }
      });

      await this.displayApiService.savePlaylistSlides(playlistId, newSlides);
      return true;
    } catch (error) {
      this.logger.error(
        `Error updating the playlist "${playlist["@id"]}"`,
        (error as Error).message
      );
      return false;
    }
  }

  /**
   * Formats an event date.
   *
   * @param {string} dateString the date string to format.
   * @return {string} the formatted date.
   */
  formatEventDate(dateString: string): string {
    const [day, month, year] = dateString.split(".");
    // Date needs month as 0-11.
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
    return format(date, "EEEE 'd'. d. MMMM", { locale: daLocale }).replace(/^\w/, (letter) =>
      letter.toUpperCase()
    );
  }
}
