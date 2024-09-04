import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap () {
    const app = await NestFactory.create( AppModule );
    const logger = new Logger( 'Bootstrap' );
    const configService = new ConfigService();

    app.setGlobalPrefix( 'api' );
    app.useGlobalPipes(
        new ValidationPipe( {
            whitelist: true,
            forbidNonWhitelisted: true
        } )
    );

    const swaggerConfig = new DocumentBuilder()
        .setTitle( 'Teslo WebSockets' )
        .setDescription( 'Teslo Chat with Websockets' )
        .setVersion( '1.0' )
        .build();

    const document = SwaggerModule.createDocument( app, swaggerConfig );
    SwaggerModule.setup( 'api', app, document );

    await app.listen( configService.get( 'PORT' ) );

    logger.log( `>> Application run in ${ await app.getUrl() }` );
}


bootstrap();
