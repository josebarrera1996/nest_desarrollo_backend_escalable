import { Injectable } from '@nestjs/common'
import { ProductsService } from './../products/products.service'
import { initialData } from './data/seed-data'

@Injectable()
export class SeedService {
    constructor ( private readonly _productsService: ProductsService ) { }

    async runSeed () {
        await this._insertNewProducts()
        return 'Seed Executed'
    }

    private async _insertNewProducts () {
        await this._productsService.deleteAllProducts()

        const seedProduts = initialData.products

        const insertPromises = []

        seedProduts.forEach( product => {
            insertPromises.push( this._productsService.create( product ) )
        } )

        await Promise.all( insertPromises )

        return
    }
}
