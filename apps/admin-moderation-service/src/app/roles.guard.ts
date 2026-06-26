import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const role = request.headers['x-role'];

        if (role !== 'admin') {
            throw new ForbiddenException("Require access token");
        }
        return true;
    }
}