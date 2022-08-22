import { Injectable, Logger } from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import { PlaylistPlaylistJsonld, PutV1PlaylistSlideIdRequestInner } from "../display-api-client";
import { NemdelingSlide } from "./types";
import { PlaylistSlide } from "../display-api/types";

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
    return new Promise((resolve, reject) => {
      // If slide is existing, weight may need to be updated, but that is done later.
      const existingSlide = playlistSlides.find(
        (item) => JSON.stringify(slide.content) === JSON.stringify(item.content)
      );
      if (existingSlide) {
        resolve({
          slide: existingSlide["@id"].replace("/v1/slides/", ""),
          weight: weight,
        });
      }
      // If slide does not exist we always create + delete.
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
        `❌ ~ error fetching slides from playlist with id: "${playlist["@id"]}"`,
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
        if (newSlides.filter((newSlide) => newSlide.slide === oldSlide["@id"]).length === 0) {
          void this.displayApiService.deleteSlide(oldSlide["@id"].replace("/v1/slides/", ""));
        }
      });

      await this.displayApiService.savePlaylistSlides(playlistId, newSlides);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ ~ error updating the playlist "${playlist["@id"]}"`,
        (error as Error).message
      );
      return false;
    }
  }
}
