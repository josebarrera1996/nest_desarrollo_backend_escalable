import { Module } from '@nestjs/common'
import { BrandsModule } from '../brands/brands.module'
import { CarsModule } from '../cars/cars.module'
import { SeedController } from './seed.controller'
import { SeedService } from './seed.service'

@Module( {
    controllers: [ SeedController ],
    providers: [ SeedService ],
    imports: [ CarsModule, BrandsModule ]
} )
export class SeedModule { }
