import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IncomingHttpHeaders } from 'http2';

import { AuthService } from './auth.service';
import { ValidRoles } from './constants';
import { Auth, GetUser, RawHeaders, RoleProtected } from './decorators';
import { CreateUserDTO } from './dto/create-user.dto';
import { LoginUserDTO } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { UserRoleGuard } from './guards/user-role.guard';

@Controller( 'auth' )
export class AuthController {
    constructor ( private readonly authService: AuthService ) { }

    @Post( 'register' )
    register ( @Body() createUserDto: CreateUserDTO ) {
        return this.authService.create( createUserDto );
    }

    @Post( 'login' )
    login ( @Body() loginUserDto: LoginUserDTO ) {
        return this.authService.login( loginUserDto );
    }

    @Get( 'private-testing' )
    @UseGuards( AuthGuard() )
    testingPrivateRoute (
        @RawHeaders() rawHeaders: string[],
        @Headers() headers: IncomingHttpHeaders,
        @GetUser() user: User,
        @GetUser( 'email' ) email: string
    ) {
        return {
            ok: true,
            message: 'Ruta privada',
            rawHeaders,
            headers,
            user,
            email
        };
    }

    @Get( 'private-testing-2' )
    @RoleProtected( ValidRoles.ADMIN, ValidRoles.SUPERUSER )
    @UseGuards( AuthGuard(), UserRoleGuard )
    privateRoute2 ( @GetUser() user: User ) {
        return {
            ok: true,
            user
        };
    }

    @Get( 'private-testing-3' )
    @Auth( ValidRoles.ADMIN, ValidRoles.SUPERUSER )
    privateRoute3 ( @GetUser() user: User ) {
        return {
            ok: true,
            user
        };
    }

    @Get( 'check-status' )
    @Auth()
    checkAuthStatus ( @GetUser() user: User ) {
        return this.authService.checkAuthStatus( user );
    }
}
