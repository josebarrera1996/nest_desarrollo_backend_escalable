import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { User } from './entities/user.entity';
import { CreateUserDTO, LoginUserDTO } from './dtos';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags( 'Auth' )
@Controller( 'auth' )
export class AuthController {
    constructor ( private readonly authService: AuthService ) { }

    @Post( 'register' )
    @ApiResponse( { status: 201, description: 'User was registered' } )
    register ( @Body() createUserDto: CreateUserDTO ) {
        return this.authService.create( createUserDto );
    }

    @Post( 'login' )
    @ApiResponse( { status: 200, description: 'Successful login' } )
    @ApiResponse( { status: 401, description: 'Invalid Credentials' } )
    login ( @Body() loginUserDto: LoginUserDTO ) {
        return this.authService.login( loginUserDto );
    }

    @Get( 'check-status' )
    @Auth()
    @ApiResponse( { status: 200, description: 'Renew token' } )
    checkAuthStatus ( @GetUser() user: User ) {
        return this.authService.checkAuthStatus( user );
    }
}
