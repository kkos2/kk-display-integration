import { ApiProperty } from "@nestjs/swagger";

export class ServiceMessage {
  @ApiProperty({
    description: "The title of the service message",
    default: "Service message",
  })
  title = "";

  @ApiProperty({
    description: "The service message text",
    default: "<p>An important service message.</p>",
  })
  text = "";

  @ApiProperty({
    description: "The names of the screens to show the message on",
    default: ["screen_1", "screen_2"],
  })
  screens: string[] = [];
}
