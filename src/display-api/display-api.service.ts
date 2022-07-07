import { Injectable, Logger } from '@nestjs/common';
import {
  AuthenticationApi,
  Configuration,
  SlidesApi, SlideSlideInput,
  SlideSlideInputJsonld, TemplatesApi,
  Token
} from "../display-api-client";
import { Agent } from "https";
@Injectable()
export class DisplayApiService {
  constructor(
    private readonly logger: Logger
  ) {}

  /**
   * @TODO: How to make this configurable?
   */
  configuration = new Configuration({
    basePath: 'https://displayapiservice.local.itkdev.dk',
    baseOptions: {
      // Axios won't accept our mkcert certs for now - so lets just disable
      // cert verification.
      httpsAgent: new Agent({
        rejectUnauthorized: false,
      }),
    },
  });

  /**
   * Get admin token used for making requests.
   */
  async getAdminToken(): Promise<Token> {
    const authentication = new AuthenticationApi(this.configuration);

    /**
     * @TODO: How to make this configurable?
     */
    const credentials = {
      email: 'admin@example.com',
      password: 'password',
    };

    const response = await authentication.postCredentialsItem(credentials);

    return response.data;
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
  async getTemplateId(title: string): Promise<string|void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const templatesApi = new TemplatesApi(config);
      const response = await templatesApi.getV1Templates(1, '1', title);
      if (response.data['hydra:member'].length === 1) {
        return response.data['hydra:member'][0]['@id'];
      }
    } catch (error) {
      console.log(
        '❌ ~ error fetching template id for title: ' + title,
        error.message,
      );
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
  async fetchSlides(type?: string): Promise<Array<SlideSlideInput>> {
    const templateId = await this.getTemplateId(type);
    if (!templateId) {
      return [];
    }

    try {
      const config = await this.getAuthenticatedConfig();
      const slideApi = new SlidesApi(config);
      let page = 1;
      const itemsPerPage = '24';
      let fetch = true;
      const slides = [];
      while (fetch) {
        const response = await slideApi.getV1Slides(page, itemsPerPage);
        response.data['hydra:member'].forEach(slide => {
          if (slide.templateInfo['@id'] === templateId) {
            slides.push(slide);
          }
        });
        if (response.data['hydra:member'].length < itemsPerPage) {
          fetch = false;
        }
        else {
          page += 1;
        }
        console.log(slides);
      }
    } catch (error) {
      console.log(
        '❌ ~ error fetching slides',
        error.message,
      );
    }

    this.logger.debug('fetchSlides');
  }

  async updateSlide(id: string, slideData: SlideSlideInputJsonld): Promise<void> {
    try {
      const config = await this.getAuthenticatedConfig();
      const slideApi = new SlidesApi(config);

      await slideApi.putV1SlideId(id, slideData);
    } catch (error) {
      console.log(
        '❌ ~ error updating slide with id: ' + id,
        JSON.stringify(slideData),
        error.message,
      );
    }
  }

}