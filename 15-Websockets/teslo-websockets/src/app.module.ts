import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JoiValidationSchema } from './config/joi.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonsModule } from './commons/commons.module';
import { SeedModule } from './seed/seed.module';
import { MessagesWsModule } from './messages-ws/messages-ws.module';

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
            synchronize: true
        } ),
        AuthModule,
        CommonsModule,
        SeedModule,
        MessagesWsModule
    ],
} )
export class AppModule { }
