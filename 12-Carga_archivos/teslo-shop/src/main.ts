import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

async function bootstrap () {
    const app = await NestFactory.create( AppModule )
    const logger = new Logger( 'Bootstrap' )
    const configService = new ConfigService()

    app.setGlobalPrefix( 'api' )

    app.useGlobalPipes(
        new ValidationPipe( {
            whitelist: true,
            forbidNonWhitelisted: true
        } )
    )

    await app.listen( configService.get( 'PORT' ) )

    logger.log( `>> Application run in ${ await app.getUrl() }` )
}
bootstrap()
