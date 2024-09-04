import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product, ProductImage } from './entities'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

@Module( {
    controllers: [ ProductsController ],
    providers: [ ProductsService ],
    imports: [
        TypeOrmModule.forFeature( [
            Product,
            ProductImage
        ] ),
        ConfigModule
    ],
    exports: [ ProductsService ]
} )
export class ProductsModule { }
