import { Injectable } from '@nestjs/common'
import { CarsService } from 'src/cars/cars.service'
import { BrandsService } from '../brands/brands.service'
import { BRANDS_SEED } from './data/brands.seed'
import { CARS_SEED } from './data/cars.seed'


@Injectable()
export class SeedService {
    constructor (
        private readonly _carsService: CarsService,
        private readonly _brandsService: BrandsService
    ) { }

    populateDB () {
        this._carsService.fillCarsWithSeedData( CARS_SEED )
        this._brandsService.fillBrandsWithSeedData( BRANDS_SEED )
        return 'SEED executed'
    }
}
