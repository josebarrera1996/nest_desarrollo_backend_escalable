import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { IJwtPayload } from "../interfaces";

@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        configService: ConfigService
    ) {
        super( {
            secretOrKey: configService.get( 'JWT_SECRET' ),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        } );
    }

    async validate ( payload: IJwtPayload ): Promise<User> {
        const { id } = payload;

        const user = await this._userRepository.findOneBy( { id } );

        if ( !user ) throw new UnauthorizedException( 'Token not valid' );

        if ( !user.isActive ) throw new UnauthorizedException( 'User is inactive, talk with an admin' );

        return user;
    }
}