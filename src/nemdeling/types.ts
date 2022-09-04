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
    item: Array<{
      field_display_institution: Array<{ item: string[] }>;
      nid: string[];
      title_field: string[];
      field_background_color: string[];
      body: string[];
      field_os2_display_list_spot: Array<{ item: string[] }>;
    }>;
  };
};
