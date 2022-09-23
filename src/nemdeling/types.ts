export type NemdelingSlide = {
  templateId: string;
  content: any;
};

export type NemDelingResult = {
  name: string;
  status: string;
};

export type ServiceMessageBody = {
  result: {
    item?: Array<{
      field_display_institution: Array<{ item: string[] }>;
      nid: string[];
      title_field: string[];
      field_background_color: string[];
      body: string[];
      field_os2_display_list_spot: Array<{ item: string[] }>;
    }>;
  };
};

export type EventBody = {
  result: {
    item: Array<{
      startdate: Array<{ item: string[] }>;
      enddate: Array<{ item: string[] }>;
      time: Array<{ item: string[] }>;
      nid: string[];
      billede: Array<{
        item: Array<{
          img: Array<{
            $: { src: string; alt: string; height: string; width: string; title: string };
          }>;
        }>;
      }>;
      title: string[];
      field_teaser: string[];
      host: string[];
      background_color?: string[];
      screen: Array<{ item: string[] }>;
    }>;
  };
};
