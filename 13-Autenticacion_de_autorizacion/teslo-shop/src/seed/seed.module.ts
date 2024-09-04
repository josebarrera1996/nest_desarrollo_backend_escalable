import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module( {
    imports: [
        ProductsModule,
        AuthModule
    ],
    controllers: [ SeedController ],
    providers: [ SeedService ]
} )
export class SeedModule { }
