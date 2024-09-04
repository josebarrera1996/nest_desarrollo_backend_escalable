import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap () {
    const app = await NestFactory.create( AppModule )

    app.setGlobalPrefix( 'api' )

    app.useGlobalPipes( new ValidationPipe( {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true
        }
    } ) )

    await app.listen( Number( process.env.PORT ) || 3001 )

    console.log( `>>> Application running on ${ await app.getUrl() }` )
}
bootstrap()
