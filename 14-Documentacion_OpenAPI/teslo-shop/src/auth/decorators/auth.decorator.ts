import { UseGuards, applyDecorators } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ValidRoles } from "../constants";
import { UserRoleGuard } from "../guards/user-role.guard";
import { RoleProtected } from "./role-protected.decorator";

export function Auth ( ...roles: ValidRoles[] ) {
    return applyDecorators(
        RoleProtected( ...roles ),
        UseGuards( AuthGuard(), UserRoleGuard )
    );
}