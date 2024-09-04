import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JoiValidationSchema } from './config/joi.validation'
import { ProductsModule } from './products/products.module'
import { CommonsModule } from './commons/commons.module'
import { SeedModule } from './seed/seed.module';

@Module( {
    imports: [
        ConfigModule.forRoot( {
            validationSchema: JoiValidationSchema
        } ),

        TypeOrmModule.forRoot( {
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number( process.env.DB_PORT ),
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            autoLoadEntities: true,
            synchronize: true,
        } ),

        ProductsModule,

        CommonsModule,

        SeedModule
    ],
} )
export class AppModule { }
