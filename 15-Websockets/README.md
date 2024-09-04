# Sección 15: Websockets

Esta sección tiene información sobre la comunicación entre cliente y servidor mediante WebSockets, puntualmente veremos:

- Nest Gateways
- Conexión
- Desconexión
- Emitir y escuchar mensajes desde el servidor y cliente
- Cliente con Vite y TS
- Autenticar conexión mediante JWTs
- Usar mismo mecanismos de autenticación previamente creado
- Desconectar sockets manualmente
- Prevenir doble conexión de usuarios autenticados.

## Inicio del proyecto

Para esta sección vamos a crear un nuevo proyecto, pero usaremos el módulo de autenticación del último proyecto. Para inicializar el nuevo backend en Nest, usaremos el siguiente comando:

```txt
$: nest new teslo-websockets
```

### Instalación de paquetes

Para evitar el linter que tiene por defecto Nest, iremos al archivo `.eslintrc.js` y eliminamos la extensión recomendada de prettier. Si queremos volverla a usar, podemos solo documentarla, pero si queremos eliminarla totalmente, desinstalamos los módulos relacionados a prettier.

También vamos a usar la documentación con el estándar de OpenAPI que usamos en la última lección de la sección anterior, por lo que realizamos la instalación con el siguiente comando:

```txt
$: pnpm i --save @nestjs/swagger
```

Algunos paquetes adicionales que hemos usado en otras lecciones los vamos a usar con el siguiente comando:

```txt
$: pnpm i -S bcrypt class-validator class-transformer joi passport-jwt pg typeorm @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/typeorm
```

### Configuración de la base de datos

Para la base de datos usaremos un servicio de postgres en docker-compose, por lo que creamos el archivo `docker-compose.yml` a raíz del proyecto con el siguiente contenido:

```yaml
version: '3'

services:
    db:
        image: postgres:14.3
        container_name: ${DB_NAME}
        restart: always
        ports:
            - "${DB_PORT}:5432"
        environment:
            POSTGRES_USER: ${DB_USER}
            POSTGRES_PASSWORD: ${DB_PASSWORD}
            POSTGRES_DB: ${DB_NAME}
        volumes:
            - ./postgres:/var/lib/postgresql/data
```

### Configuración del punto de acceso al proyecto

En el archivo `main.ts` vamos a realizar la siguiente configuración para los logs, variables de usuario, prefijo global de los endpoints, validación de campos en la petición, y documentación con swagger:

```ts
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
```

### Definición y validación de variables de entorno

En el archivo `.env` vamos a guardar las siguientes variables:

```.env
DB_HOST = localhost
DB_PORT = 5433
DB_USER = nest-user
DB_PASSWORD = 53CR3T_P455W0RD
DB_NAME = teslo-db

PORT = 3000
HOST_API = http://localhost:3000/api

JWT_SECRET = JWT*K3Y*S3CR3T
```

Vamos a crear una carpeta llamada `config` en donde tendremos un esquema de validación de las variables de entorno, haciendo uso del paquete `joi`:

```ts
import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object( {
    DB_HOST: Joi.required().default( 'localhost' ),
    DB_PORT: Joi.number().default( 5433 ),
    DB_USER: Joi.required().default( 'postgres' ),
    DB_PASSWORD: Joi.required(),
    DB_NAME: Joi.required()
} );
```

Para apoyarnos durante el desarrollo, vamos a crear un archivo llamado `src/types/index.d.ts` en donde definiremos las variables de entorno:

```ts
declare namespace NodeJS {
    interface ProcessEnv {
        DB_HOST: string;
        DB_PORT: number;
        DB_USER: string;
        DB_PASSWORD: string;
        DB_NAME: string;
        PORT: number;
        HOST_API: string;
        JWT_SECRET: string;
    }
}
```

### Configuración global de la aplicación

En el archivo `app.module.ts` debemos realizar la configuración del `ConfigModule` y de `TypeOrmModule`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JoiValidationSchema } from './config/joi.validation';
import { TypeOrmModule } from '@nestjs/typeorm';

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
        AuthModule
    ],
} )
export class AppModule { }
```

### Módulo Común

Vamos a crear un módulo para elementos comunes como el manejo de errores de la base de datos, para lo cual usamos el siguiente comando:

```txt
$: nest g mo commons --no-spec
```

Lo siguiente sera crear un servicio con el siguiente comando

```txt
$: nest g s commons/services/db-exception --no-spec --flat
```

Este servicio contendrá lo siguiente:

```ts
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { PostgreSQLErrorCodes } from '../enums/db-error-codes.enum'

@Injectable()
export class DBExceptionService {
    private static logger = new Logger( 'DBExceptionService' )

    /**
     * If the error is a NOT_NULL_VIOLATION or UNIQUE_VIOLATION, throw a BadRequestException, otherwise
     * throw an InternalServerErrorException
     * @param {any} error - any - this is the error object that is passed to the function.
     */
    public static handleDBException ( error: any ): never {
        if ( error.code === PostgreSQLErrorCodes.NOT_NULL_VIOLATION )
            throw new BadRequestException( error.detail )

        if ( error.code === PostgreSQLErrorCodes.UNIQUE_VIOLATION )
            throw new BadRequestException( error.detail )

        this.logger.error( error )
        console.error( error )
        throw new InternalServerErrorException( "Unexpected error, check server logs" )
    }
}
```

En el archivo `commons.module.ts` debemos agregar la siguiente configuración:

```ts
import { Module } from '@nestjs/common';
import { DBExceptionService } from './services/db-exception.service';

@Module( {
    providers: [ DBExceptionService ],
    exports: [ DBExceptionService ]
} )
export class CommonsModule { }
```

### Módulo de Autenticación

A continuación creamos el módulo de autenticación mediante la ayuda de `resource` sin CRUD con el siguiente comando:

```txt
$: nest g res auth --no-spec
```

En este nuevo modulo creamos un directorio para las constantes, en este caso sera un enum con los roles validos y con la meta información para los decoradores:

```ts
export const META_ROLES = 'roles';

export enum ValidRoles {
    ADMIN = 'ADMIN',
    SUPERUSER = 'SUPERUSER',
    USER = 'USER'
}
```

#### Entidad de Usuarios

Creamos un archivo para la entidad de usuarios, la cual contendrá las siguientes propiedades:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ValidRoles } from '../constants';

@Entity( 'users' )
export class User {
    @ApiProperty( { uniqueItems: true } )
    @PrimaryGeneratedColumn( 'uuid' )
    id: string;

    @ApiProperty( { uniqueItems: true } )
    @Column( { type: 'text', unique: true } )
    email: string;

    @ApiProperty()
    @Column( { type: 'text', select: false } )
    password: string;

    @ApiProperty( {} )
    @Column( 'text' )
    fullName: string;

    @ApiProperty( { default: true } )
    @Column( { type: 'bool', default: true } )
    isActive: string;

    @ApiProperty( { enum: ValidRoles, isArray: true, required: false } )
    @Column( { type: 'text', array: true, default: ValidRoles.USER } )
    roles: ValidRoles[];

    @BeforeInsert()
    @BeforeUpdate()
    checkFieldsBeforeInsertOrUpdate () {
        this.email = this.email.toLowerCase().trim();
    }
}
```

#### JWTStrategy

Para la autenticación usaremos la estrategia de JWT, por lo que creamos el archivo `jwt.strategy.ts` para esta provider dentro de `strategies`:

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { IJwtPayload } from "../interfaces";

@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        configService: ConfigService
    ) {
        super( {
            secretOrKey: configService.get( 'JWT_SECRET' ),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        } );
    }

    async validate ( payload: IJwtPayload ): Promise<User> {
        const { id } = payload;

        const user = await this._userRepository.findOneBy( { id } );

        if ( !user ) throw new UnauthorizedException( 'Token not valid' );

        if ( !user.isActive ) throw new UnauthorizedException( 'User is inactive, talk with an admin' );

        return user;
    }
}
```

#### Configuración del módulo de autenticación

Lo siguiente es configurar el archivo `auth.module.ts` para establecer el uso del módulo de configuración, identificar la entidad `User` como una tabla en la base de datos, definir el uso de los módulos de `Passport` y `JWT` con la configuración que debe conservar el token, además de llamar el provider que creamos para la estrategia, y de exportar las configuraciones más relevantes:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module( {
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature( [
            User
        ] ),
        PassportModule.register( { defaultStrategy: 'jwt' } ),
        JwtModule.registerAsync( {
            imports: [ ConfigModule ],
            inject: [ ConfigService ],
            useFactory: ( configService: ConfigService ) => {
                return {
                    secret: configService.get( 'JWT_SECRET' ),
                    signOptions: {
                        expiresIn: '2h'
                    }
                };
            }
        } )
    ],
    controllers: [ AuthController ],
    providers: [ AuthService, JwtStrategy ],
    exports: [ TypeOrmModule, JwtStrategy, PassportModule, JwtModule ]
} )
export class AuthModule { }
```

#### DTOs (Data Transfer Object)

Es momento de crear las clases que nos permiten validar los elementos que reciben nuestros endpoint, en este caso crearemos los DTOs de creación de usuario y de login del mismo.

El archivo `create-user.dto.ts` tendrá la siguiente definición:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDTO {
    @ApiProperty( { example: 'test@mail.com' } )
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty( {
        pattern: '/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/',
        minLength: 6,
        maxLength: 50,
        example: 'P44sw0rd'
    } )
    @IsString()
    @MinLength( 6 )
    @MaxLength( 50 )
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    } )
    password: string;

    @ApiProperty( {
        minLength: 1,
        example: 'Name Lastname'
    } )
    @IsString()
    @MinLength( 1 )
    fullName: string;
}
```

Dentro del archivo `login-user.dto.ts` vamos a definir las siguiente clase:

```ts
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginUserDTO {
    @ApiProperty( { example: 'test@mail.com' } )
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty( {
        pattern: '/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/',
        minLength: 6,
        maxLength: 50,
        example: 'P44sw0rd'
    } )
    @IsString()
    @MinLength( 6 )
    @MaxLength( 50 )
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    } )
    password: string;
}
```

Por último, dentro de un archivo `index.ts` que sirva como archivo barril, exportamos conjuntamente ambas clases:

```ts
export { CreateUserDTO } from "./create-user.dto";
export { LoginUserDTO } from "./login-user.dto";
```

#### Servicios de autenticación

Dentro del archivo `auth.service.ts` vamos a crear los siguiente métodos:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { DBExceptionService } from '../commons/services/db-exception.service';
import { CreateUserDTO, LoginUserDTO } from './dtos';
import { User } from './entities/user.entity';
import { IJwtPayload } from './interfaces';

@Injectable()
export class AuthService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        private readonly _jwtService: JwtService
    ) { }

    private _getJwtToken ( payload: IJwtPayload ) {
        return this._jwtService.sign( payload );
    }

    async create ( createUserDto: CreateUserDTO ) {
        try {
            const { password, ...userData } = createUserDto;

            const user = this._userRepository.create( {
                ...userData,
                password: bcrypt.hashSync( password, 10 )
            } );

            await this._userRepository.save( user );

            delete user.password;

            return {
                token: this._getJwtToken( { id: user.id } ),
                user
            };
        } catch ( error ) {
            DBExceptionService.handleDBException( error );
        }
    }

    async login ( loginUserDto: LoginUserDTO ) {
        const { email, password } = loginUserDto;

        const user = await this._userRepository.findOne( {
            where: { email },
            select: { id: true, email: true, password: true }
        } );

        if ( !user || !bcrypt.compareSync( password, user.password ) )
            throw new UnauthorizedException( 'Invalid Credentials' );

        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }

    checkAuthStatus ( user: User ) {
        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }
}
```

#### Decorador de autenticación

Crearemos el decorador que nos permite validar el uso de un endpoint basado en sus roles, y para esto usamos el siguiente comando:

```txt
$: nest g d auth/decorators/role-protected --no-spec --flat
```

El decorador configurara la metadata que se debe pasar dentro de la petición de la siguiente manera:

```ts
import { SetMetadata } from '@nestjs/common';
import { META_ROLES, ValidRoles } from '../constants';

export const RoleProtected = ( ...args: ValidRoles[] ) => SetMetadata( META_ROLES, args );
```

Luego creamos un guard con el comando a continuación, que controle la activación de la ruta, basado en los roles que lleguen en la metadata:

```txt
$: nest g gu auth/guards/user-role --no-spec --flat
```

El guard compara los roles validos, con los roles que tiene el usuario en la base de datos:

```ts
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { META_ROLES } from '../constants';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRoleGuard implements CanActivate {
    constructor ( private readonly _reflector: Reflector ) { }

    canActivate (
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const validRoles: string[] = this._reflector.get( META_ROLES, context.getHandler() );

        if ( !validRoles || !validRoles.length ) return true;

        const user: User = context.switchToHttp().getRequest().user;

        if ( !user ) throw new BadRequestException( 'User not found' );

        for ( const role of user.roles ) {
            if ( validRoles.includes( role ) ) return true;
        }

        throw new ForbiddenException( `User '${ user.fullName }' need a valid role: [${ validRoles }]` );
    }
}

```

Por último, creamos una composición de decoradores para aplicar todo lo anterior:

```txt
$: nest g d auth/decorators/auth --no-spec --flat
```

Este nuevo archivo contendrá la siguiente lógica:

```ts
import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ValidRoles } from '../constants';
import { UserRoleGuard } from '../guards/user-role.guard';
import { RoleProtected } from './role-protected.decorator';

export const Auth = ( ...roles: ValidRoles[] ) => {
    return applyDecorators(
        RoleProtected( ...roles ),
        UseGuards( AuthGuard(), UserRoleGuard )
    );
};
```

#### Decorador para obtención del usuario en la request

Necesitamos un decorador que nos permita a nivel de propiedad, obtener la información de un usuario que hace la petición, para ello usamos el siguiente controlador:

```txt
$: nest g d auth/decorators/get-user --no-spec --flat
```

El decorador tiene esta apariencia:

```ts
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from '@nestjs/common';

export const GetUser = createParamDecorator( ( data, ctx: ExecutionContext ) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if ( !user ) throw new InternalServerErrorException( 'User not found in request' );

    return ( !data ) ? user : user[ data ];
} );
```

#### Controlador

En el controlador contaremos inicialmente con 3 endpoints: registro, login y verificación del token:

```ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { User } from './entities/user.entity';
import { CreateUserDTO, LoginUserDTO } from './dtos';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags( 'Auth' )
@Controller( 'auth' )
export class AuthController {
    constructor ( private readonly authService: AuthService ) { }

    @Post( 'register' )
    @ApiResponse( { status: 201, description: 'User was registered' } )
    register ( @Body() createUserDto: CreateUserDTO ) {
        return this.authService.create( createUserDto );
    }

    @Post( 'login' )
    @ApiResponse( { status: 200, description: 'Successful login' } )
    @ApiResponse( { status: 401, description: 'Invalid Credentials' } )
    login ( @Body() loginUserDto: LoginUserDTO ) {
        return this.authService.login( loginUserDto );
    }

    @Get( 'check-status' )
    @Auth()
    @ApiResponse( { status: 200, description: 'Renew token' } )
    checkAuthStatus ( @GetUser() user: User ) {
        return this.authService.checkAuthStatus( user );
    }
}
```

#### Seed

Para el momento de desarrollo vamos a crear un módulo seed con información de ejemplo que se pueda usar en las pruebas. Para esto vamos a usar el siguiente comando:

```txt
$: nest g mo seed --no-spec
```

Tendremos un archivo llamado `data/seed-data.ts` en donde ubicamos la siguiente información:

```ts
import * as bcrypt from 'bcrypt';
import { ValidRoles } from '../../auth/constants';

interface SeedUser {
    email: string;
    fullName: string;
    password: string;
    roles: ValidRoles[];
}

interface SeedData {
    users: SeedUser[];
}


export const initialData: SeedData = {
    users: [
        {
            email: "test1@mail.com",
            fullName: "Test 1",
            password: bcrypt.hashSync( "test123", 10 ),
            roles: [ ValidRoles.ADMIN ]
        },
        {
            email: "test2@mail.com",
            fullName: "Test 2",
            password: bcrypt.hashSync( "test123", 10 ),
            roles: [ ValidRoles.ADMIN, ValidRoles.USER ]
        }
    ]
};
```

Dentro del `seed.module.ts` debemos realizar la importación de los módulos necesarios para el funcionamiento del seed, en este caso el `AuthModule` en donde se ubica la entidad de usuarios:

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module( {
    imports: [
        AuthModule
    ],
    controllers: [ SeedController ],
    providers: [ SeedService ]
} )
export class SeedModule { }
```

Creamos un servicio con los siguientes métodos:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
    ) { }

    async runSeed () {
        await this._deleteTables();
        await this._insertUsers();
        return 'Seed Executed';
    }

    private async _deleteTables () {

        await this._userRepository
            .createQueryBuilder()
            .delete()
            .where( {} )
            .execute();
    }

    private async _insertUsers () {
        const seedUsers = initialData.users;

        const users: User[] = [];

        seedUsers.forEach( user => {
            users.push( this._userRepository.create( user ) );
        } );

        const dbUsers = await this._userRepository.save( users );

        return dbUsers[ 0 ];
    }
}
```

Por último en el controlador añadimos la siguiente información:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags( 'Seed' )
@Controller( 'seed' )
export class SeedController {
    constructor ( private readonly seedService: SeedService ) { }

    @Get()
    executeSeed () {
        return this.seedService.runSeed();
    }
}
```

### Comandos para la ejecución del proyecto

Vamos a levantar la base de datos con el siguiente comando:

```txt
$: docker-compose up -d
```

Y levantamos el proyecto en modo desarrollo con el siguiente comando:

```txt
$: pnpm start:dev
```

Para tener los datos de prueba debemos usar el endpoint `http://localhost:3000/api/seed/`

## Websocket Gateways

Vamos a crear un Gateway que se conecte con los Web Sockets, los cuales nos permiten tener información en tiempo real desde el backend mediante una comunicación activa de "tu a tu". Los Web Sockets le permiten al servidor comunicarse con el cliente. Podríamos pensar que un Gateways actúa como un controlador, pero se diferencia por su implementación con socket.io y/o ws.

Para generar un gateway podemos usar el comando para generar recursos, pero con la opción de websockets.

```txt
$: nest g res messages-ws --no-spec
? What transport layer do you use? WebSockets
? Would you like to generate CRUD entry points? No
```

La apariencia inicial de un gateway es la siguiente:

```ts
import { WebSocketGateway } from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';

@WebSocketGateway()
export class MessagesWsGateway {
    constructor ( private readonly messagesWsService: MessagesWsService ) { }
}
```

Es importante realizar la instalación del paquete para los websockets con el siguiente comando:

```txt
$: pnpm i -S @nestjs/websockets @nestjs/platform-socket.io
```

Lo siguiente es realizar una modificación al decorador `@WebSocketGateway` para activar los cors:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway { ... }
```

Para comprobar que si está funcionando el nuevo módulo, apuntamos una petición GET a la siguiente dirección `localhost:3000/socket.io/socket.io.js`, y obtendremos el contenido del archivo js de la librería.

## Server - Escuchar conexiones y desconexiones

El servidor será nuestra aplicación de Nest, y el cliente será la aplicación de frontend que se conectará a través de los web sockets. Un namespaces es el nombre que recibe la sala o espacio a la que se conectan los usuarios.

Primero vamos a instalar el paquete oficial de Socket.io:

```txt
$: pnpm i socket.io
```

Cuando un cliente se conecta o desconecta, podemos reaccionar y capturar información del mismo, y para ello implementamos algunas interfaces dentro del gateway:

```ts
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Socket } from 'socket.io';
...

@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor ( private readonly messagesWsService: MessagesWsService ) { }

    handleConnection ( client: any ) {
        console.log( `Client connected: ${ client.id }` );
    }

    handleDisconnect ( client: Socket ) {
        console.log( `Client disconnected: ${ client.id }` );
    }
}
```

En base a los métodos implementados podremos usar la información del cliente en las siguiente lecciones.

## Cliente - Vite Vanilla TypeScript

Vamos a crear una aplicación cliente mediante Vite con un template de Vanilla TS, para ello usamos el siguiente comando:

```txt
$: pnpm create vite ws-client --template vanilla-ts
```

Para levantar la aplicación usamos el comando:

```txt
$: pnpm dev
```

Dentro del proyecto cliente instalamos el siguiente paquete (idealmente debemos instalar la misma versión del paquete que se encuentra en el backend):

```txt
$: pnpm i socket.io-client
```

Creamos un archivo llamado `socket-client.ts` y añadimos la siguiente lógica:

```ts
import { Manager } from 'socket.io-client';

export const connectToServer = () => {
    const manager = new Manager( 'http://localhost:3000/socket.io/socket.io.js' );

    const socket = manager.socket( '/' );
};
```

Esto lo complementamos con las siguiente líneas en `main.ts`:

```ts
import { connectToServer } from './socket-client';
import './style.css';

document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        <h1>Websocket Client</h1>
        <span>offline</span>
    </div>
`;

connectToServer();
```

Ahora, cada que recargamos la dirección donde está corriendo el cliente, o creamos nuevas pestañas de la misma, podremos observar en los logs del back que se muestra una dirección del cliente al momento de conectarse o desconectarse, ejemplo:

```txt
Client connected: ZViDLxFlXr7eDKo_AAAB
Client disconnected: ZViDLxFlXr7eDKo_AAAB
Client connected: uLuqgnDyliDODmECAAAD
Client disconnected: uLuqgnDyliDODmECAAAD
```

## Server - Mantener identificados los clientes

El socket solo tiene información que necesita para identificar los clientes, pero no guarda relación con el servidor. Lo que vamos a hacer es identificar los clientes dentro del backend, y para esto tenemos que definir dentro del servicio de ws un objeto con los clientes que se conectan, para posteriormente añadir o remover los usuarios según la acción.

```ts
...
import { Socket } from 'socket.io';

interface IConnectedClients {
    [ id: string ]: Socket;
}

@Injectable()
export class MessagesWsService {
    private connectedClients: IConnectedClients = {};

    registerClient ( client: Socket ) {
        this.connectedClients[ client.id ] = client;
    }

    removeClient ( clientId: string ) {
        delete this.connectedClients[ clientId ];
    }
}
```

Luego en el gateway llamamos los métodos del servicio:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor ( private readonly messagesWsService: MessagesWsService ) { }

    handleConnection ( client: any ) {
        this.messagesWsService.registerClient( client );
    }

    handleDisconnect ( client: Socket ) {
        this.messagesWsService.removeClient( client.id );
    }
}
```

También podemos obtener la cantidad de clientes conectados, contando la cantidad de llaves dentro del objeto de clientes conectados, y luego mostrarlo a través del gateway:

```ts
@Injectable()
export class MessagesWsService {
    private connectedClients: IConnectedClients = {};
    ...
    getConnectedClients (): number {
        return Object.keys( this.connectedClients ).length;
    }
}
```

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    handleConnection ( client: any ) {
        this.messagesWsService.registerClient( client );

        console.log( { connectedClients: this.messagesWsService.getConnectedClients() } );
    }
    ...
}
```

## Cliente - Detectar conexión y desconexión

Vamos a mostrarle al cliente cuando logra conectarse al servidor, o por algún motivo se desconecta del mismo. Lo primero que haremos es ir al proyecto frontend y definir el elemento html que podrá ver el usuario:

```ts
document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        ...
        <span id="server-status">offline</span>
    </div>
`;
```

Posteriormente, iremos al archivo `socket-client.ts` y añadimos el siguiente método:

```ts
import { Manager, Socket } from 'socket.io-client';
...
export const connectToServer = () => {
    ...
    const socket = manager.socket( '/' );

    addListeners( socket );
};

const addListeners = ( socket: Socket ) => {
    const serverStatusSpan = document.querySelector( '#server-status' )!;

    socket.on( 'connect', () => {
        serverStatusSpan.textContent = 'connected';
    } );

    socket.on( 'disconnect', () => {
        serverStatusSpan.textContent = 'disconnected';
    } );
};
```

De esta manera, cada que el cliente se conecta o desconecta del servidor, el usuario tendrá la forma de observar su status frente al servidor.

## Cliente / Servidor - Clientes conectados

En la aplicación del cliente vamos a crear un order list para mostrar inicial los ids sockets de los clientes conectados:

```ts
document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        ...
        <ul id="clients-ul"></ul>
    </div>
`;
```

Dentro del servidor vamos al servicio y modificamos el método de retornar los clientes conectados, con el objetivo de retornar sus ids:

```ts
@Injectable()
export class MessagesWsService {
    ...
    getConnectedClients (): string[] {
        return Object.keys( this.connectedClients );
    }
}
```

Luego, en el gateway creamos una propiedad que tendrá acceso al servidor de websockets y por medio del cual emitimos el evento de clientes conectados:

```ts
import { ..., WebSocketServer } from '@nestjs/websockets';

@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() wss: Server;
    ...
    handleConnection ( client: Socket ) {
        this.messagesWsService.registerClient( client );

        this.wss.emit( 'clients-updated', this.messagesWsService.getConnectedClients() );
    }

    handleDisconnect ( client: Socket ) {
        this.messagesWsService.removeClient( client.id );

        this.wss.emit( 'clients-updated', this.messagesWsService.getConnectedClients() );
    }
}
```

De vuelta al cliente, debemos escuchar el evento emitido por el server dentro de `socket-client.ts`:

```ts
const addListeners = ( socket: Socket ) => {
    ...
    const clientsUl = document.querySelector( '#clients-ul' )!;
    ...
    socket.on( 'clients-updated', ( clients: string[] ) => {
        let clientsHtml = '';

        clients.forEach( id => {
            clientsHtml += `<li>${ id }</li>`;
        } );

        clientsUl.innerHTML = clientsHtml;
    } );
};
```

Ahora, cada vez que se abre una nueva instancia del cliente, podemos observar el id del socket que le pertenece, y el cual se va a refrescar cada que se recarga la página.

## Emitir Cliente - Escuchar Servidor

En la anterior lección logramos emitir desde el servidor y escuchar en el cliente, pero ahora vamos a emitir un evento desde el cliente y lo vamos a recibir en el servidor. Lo primero será crear un formulario dentro del cliente:

```ts
document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        ...
        <form id="message-form">
            <input placeholder="message" id="message-input" />
        </form>
    </div>
`;
```

En el archivo de `socket-client.ts` nos encargamos de la emisión del evento al momento de enviar el formulario:

```ts
const addListeners = ( socket: Socket ) => {
    ...
    const msgForm = document.querySelector( '#message-form' )! as HTMLFormElement;
    const msgInput = document.querySelector( '#message-input' )! as HTMLInputElement;
    ...
    msgForm.addEventListener( 'submit', ( event ) => {
        event.preventDefault();

        if ( !msgInput.value.trim().length ) return;

        socket.emit( 'message-client', { id: socket.id, message: msgInput.value } );

        msgInput.value = ''
    } );
};
```

Ahora, dentro del servidor debemos escuchar el evento, y esto lo vamos a hacer dentro del gateway. Nest nos provee un decorador con el cual nos podemos suscribir de manera inmediata a los eventos emitidos por el cliente, simplificando el proceso de codificación dentro del gateway:

```ts
import { ..., SubscribeMessage } from '@nestjs/websockets';
...
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    @SubscribeMessage( 'message-client' )
    onMessageFromClient ( client: Socket, payload: NewMessageDto ) {
        console.table( { wsClientId: client.id, ...payload } );
    }
}
```

La impresión que vamos a tener en la consola del backend al momento de escuchar el evento será la siguiente:

```txt
┌────────────┬────────────────────────┐
│  (index)   │         Values         │
├────────────┼────────────────────────┤
│ wsClientId │ 'nC6qcA4rex2QXSQWAAAB' │
│     id     │ 'nC6qcA4rex2QXSQWAAAB' │
│  message   │         'hola'         │
└────────────┴────────────────────────┘
```

## Formas de emitir desde el servidor

Queremos que el mensaje que se emite desde el cliente, también se pueda escuchar por los usuarios conectados. Lo primero será definir el lugar donde lo ubicaremos dentro del HTML:

```ts
document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        ...
        <h3>Messages</h3>
        <ul id="messages-ul"></ul>
    </div>
`;
```

Dentro de `socket-client.ts` creamos el cascarón del callback en donde estamos escuchando el evento emitido por el servidor:

```ts
const addListeners = ( socket: Socket ) => {
    const messageUl = document.querySelector( '#messages-ul' )!;
    ...
    socket.on( 'message-server', ( payload: { fullName: string, message: string; } ) => {
        messageUl.innerHTML += `<li>${ payload.fullName } - ${ payload.message }</li>`;
    } );
};
```

En el servidor usaremos el método que establecimos en el gateway de la lección anterior, ya que una vez subscrito al mensaje, lo queremos emitir al cliente:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    @SubscribeMessage( 'message-client' )
    onMessageFromClient ( client: Socket, payload: NewMessageDto ) {
        client.emit( 'message-server', {
            fullName: 'Private!!!',
            message: payload.message || 'no-message!!!'
        } );
    }
}
```

Con lo anterior, solo la persona que emite el mensaje lo va a recibir de vuelta. En el caso de que queramos emitir el mensaje a todos menos al cliente emisor, podemos modificar el método para que emita a nivel de broadcast de la siguiente manera:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    @SubscribeMessage( 'message-client' )
    onMessageFromClient ( client: Socket, payload: NewMessageDto ) {
        client.broadcast.emit( 'message-server', {
            fullName: 'Another!!!',
            message: payload.message || 'no-message°°°'
        } );
    }
}
```

Pero si queremos que todo el mundo (incluyendo el cliente emisor) pueda escuchar el mensaje, entonces debemos usar la propiedad del websocket server:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() wss: Server;
    ...
    @SubscribeMessage( 'message-client' )
    onMessageFromClient ( client: Socket, payload: NewMessageDto ) {
        this.wss.emit( 'message-server', {
            fullName: 'Public!!!',
            message: payload.message || 'no-message!!!'
        } );
    }
}
```

También se puede enviar el mensaje a un cliente o sala en especifico a través de `this.wss.to(<sala o clienteID>).emit()`

## Preparar cliente para enviar JWT

Vamos a crear un input para alojar el JWT del usuario autenticado, claramente esto no es necesario cuando tenemos la posibilidad de almacenar y recuperar el token desde el session storage, local storage o en las cookies:

```ts
document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        ...
        <input id="jwt-token" placeholder="JSON Web Token" />
        <button id="btn-connect">Connect</button>
        ...
    </div>
`;
```

Ahora debemos conectarnos al servidor solo cuando pulsamos el botón de conectar y si hay un JWT, el cual pasaremos a la función de conexión:

```ts
...
const jwtInput = document.querySelector<HTMLInputElement>( '#jwt-token' )!;
const btnConnect = document.querySelector<HTMLButtonElement>( '#btn-connect' )!;


btnConnect.addEventListener( 'click', () => {
    if ( !jwtInput.value.trim().length ) return alert( 'Enter a valid JWT' );
    connectToServer( jwtInput.value.trim() );
} );
```

En la definición del anterior método debemos recibir el token y enviarlo en los headers de la petición de conexión:

```ts
export const connectToServer = ( token: string ) => {
    const manager = new Manager( 'http://localhost:3000/socket.io/socket.io.js', {
        extraHeaders: {
            ping: 'pong',
            authentication: `Bearer ${ token }`
        }
    } );
    ...
};
...
```

Esta conexión la manejamos desde el gateway del servidor, en donde podemos recuperar los headers que le enviamos desde el cliente:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    handleConnection ( client: Socket ) {
        const token = client.handshake.headers.authentication as string;

        console.log( { token } );
        ...
    }
    ...
}
```

## Validar JWT del Handshake

Ya estamos recibiendo el token que nos envía el lado del cliente, lo que haremos ahora, es validar el JWT para obtener el payload, por lo que dentro del gateway inyectamos el servicio de JWT:

```ts
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    constructor ( ..., private readonly _jwtService: JwtService ) { }
    ...
}
```

Para que se pueda reconocer el servicio, es necesario importar el módulo de autenticación dentro del módulo de websockets, ya que en el primero estamos exportando la configuración del `JwtModule`:

```ts
@Module( {
    imports: [ AuthModule ],
    ...
} )
export class MessagesWsModule { }
```

Regresando al método que maneja la conexión del usuario al websocket server, extraemos el payload del jwt dentro de un try-catch con el fin de que si ocurre un error desconectamos al cliente, pero en caso contrario, usamos el payload obtenido:

```ts
import { IJwtPayload } from '../auth/interfaces';
...
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    handleConnection ( client: Socket ) {
        const token = client.handshake.headers.authentication as string;
        let payload: IJwtPayload;

        try {
            payload = this._jwtService.verify( token );
        } catch ( error ) {
            client.disconnect();
            return;
        }

        console.log( { payload } );

        this.messagesWsService.registerClient( client );
        this.wss.emit( 'clients-updated', this.messagesWsService.getConnectedClients() );
    }
    ...
}
```

## Enlazar Socket con Usuario

Ahora queremos enlazar la información del usuario con el socket del cliente, una manera simple es registrar el id del payload dentro de la información de los usuarios conectados:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    async handleConnection ( client: Socket ) {
        try {
            ...
            await this.messagesWsService.registerClient( client, payload.id );
        } catch ( error ) { ... }
    }
    ...
}
```

Si el usuario no se encuentra o está desactivado, retornamos un error y no procedemos con el registro de la información, además de que lo desconectamos del websocket server.

```ts
...
interface IConnectedClients {
    [ id: string ]: {
        socket: Socket,
        user: User;
    };
}

@Injectable()
export class MessagesWsService {
    ...
    constructor ( @InjectRepository( User ) private readonly _userRepository: Repository<User> ) { }

    async registerClient ( client: Socket, userId: string ) {
        const user = await this._userRepository.findOneBy( { id: userId } );

        if ( !user ) throw new Error( 'User not found' );
        if ( !user.isActive ) throw new Error( 'User not active' );

        this.connectedClients[ client.id ] = {
            socket: client,
            user
        };
    }
    ...
}
```

Con la información del usuario siendo registrada en el objeto de clientes conectados, podemos crear un método que nos permita obtener el nombre del usuario:

```ts
@Injectable()
export class MessagesWsService {
    ...
    getUserFullName ( socketId: string ) {
        return this.connectedClients[ socketId ].user.fullName;
    }
}
```

Y cada que se envíe un mensaje, se podrá ver el nombre de quien lo envía:

```ts
@WebSocketGateway( { cors: true } )
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    ...
    @SubscribeMessage( 'message-client' )
    onMessageFromClient ( client: Socket, payload: NewMessageDto ) {
        this.wss.emit( 'message-server', {
            fullName: this.messagesWsService.getUserFullName( client.id ),
            message: payload.message || 'no-message!!!'
        } );
    }
}
```

## Desconectar usuarios duplicados

Al momento que enviamos un token se crea un nuevo socket con un id diferente pero que almacena la misma información del usuario. Esto podría ser valido si tuviéramos una aplicación multiplataforma, pero en esta ocasión no deberíamos permitir esta acción.

Lo primero que vamos a hacer es evaluar los usuarios conectados al momento de realizar la conexión de un nuevo socket:

```ts
@Injectable()
export class MessagesWsService {
    ...
    async registerClient ( client: Socket, userId: string ) {
        ...
        this._checkUserConnection( user );
        ...
    }
    ...
    private _checkUserConnection ( user: User ) {
        for ( const clientId of Object.keys( this.connectedClients ) ) {
            const connectedClient = this.connectedClients[ clientId ];

            if ( connectedClient.user.id === user.id ) {
                connectedClient.socket.disconnect();
                break;
            }
        }
    }
}
```

El problema en estos momentos es que el cliente muestra como desconectado al cliente con su nuevo socket id, y esto se debe a que los sockets anteriores siguen existiendo y escuchan al socket anterior. Lo que debemos hacer es remover todos los listeners, pero debemos elevar la instancia del socket a un scope superior a la función de `connectToServer()`, con el objetivo se saber si ya existía un socket anterior para eliminarlo y crear uno nuevo, o crear directamente uno nuevo:

```ts
let socket: Socket;

export const connectToServer = ( token: string ) => {
    ...
    socket?.removeAllListeners();
    socket = manager.socket( '/' );
    ...
};
...
```

Otro inconveniente es que aún no podemos enviar mensaje y esto se debe a que gracias a que hicimos global el socket, ahora no es necesario tenerlo como parámetro dentro de `addListeners()`:

```ts
let socket: Socket;

export const connectToServer = ( token: string ) => {
    ...
    addListeners();
};

const addListeners = () => { ... };
```
