import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

    const config = new DocumentBuilder()
        .setTitle( 'Teslo Shop RESTful API' )
        .setDescription( 'Teslo shop endpoints' )
        .setVersion( '1.0' )
        .build();

    const document = SwaggerModule.createDocument( app, config );
    SwaggerModule.setup( 'api', app, document );

    await app.listen( configService.get( 'PORT' ) );

    logger.log( `>> Application run in ${ await app.getUrl() }` );
}
bootstrap();
