import { BasicStrategy as Strategy } from "passport-http";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { IntegrationConfigService } from "src/integration-config/integration-config.service";

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: IntegrationConfigService) {
    super({ passReqToCallback: true });
  }

  public validate = async (req: Request, username: string, password: string): Promise<boolean> => {
    if (
      this.config.basicAuthCredentials.username === username &&
      this.config.basicAuthCredentials.password === password
    ) {
      return true;
    }

    throw new UnauthorizedException();
  };
}
