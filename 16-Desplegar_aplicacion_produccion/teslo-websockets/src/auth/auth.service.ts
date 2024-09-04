import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { DBExceptionService } from '../commons/services/db-exception.service';
import { CreateUserDTO, LoginUserDTO } from './dtos';
import { User } from './entities/user.entity';
import { IJwtPayload } from './interfaces';

@Injectable()
export class AuthService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        private readonly _jwtService: JwtService
    ) { }

    private _getJwtToken ( payload: IJwtPayload ) {
        return this._jwtService.sign( payload );
    }

    async create ( createUserDto: CreateUserDTO ) {
        try {
            const { password, ...userData } = createUserDto;

            const user = this._userRepository.create( {
                ...userData,
                password: bcrypt.hashSync( password, 10 )
            } );

            await this._userRepository.save( user );

            delete user.password;

            return {
                token: this._getJwtToken( { id: user.id } ),
                user
            };
        } catch ( error ) {
            DBExceptionService.handleDBException( error );
        }
    }

    async login ( loginUserDto: LoginUserDTO ) {
        const { email, password } = loginUserDto;

        const user = await this._userRepository.findOne( {
            where: { email },
            select: { id: true, email: true, password: true }
        } );

        if ( !user || !bcrypt.compareSync( password, user.password ) )
            throw new UnauthorizedException( 'Invalid Credentials' );

        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }

    checkAuthStatus ( user: User ) {
        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }
}
