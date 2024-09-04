import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module( {
    imports: [
        AuthModule
    ],
    controllers: [ SeedController ],
    providers: [ SeedService ]
} )
export class SeedModule { }
