import { ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

export class AuthBasicGuard extends AuthGuard("basic") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // We can't inject the integration config service, since this isn't an
    // injected class.
    if (!process.env.HTTP_BASIC_USER || !process.env.HTTP_BASIC_PASS) {
      // Returning true disables the auth guard, we do so if no credentials have
      // been configured.
      return true;
    }

    return super.canActivate(context);
  }
}
