# Sección 13: Autenticación de autorización

Esta es una de las secciones más grandes del curso y está cargada de muchos conceptos nuevos, mi recomendación tratar de digerirla en dos jornadas de estudio en lugar de intentar verla completamente en una sola corrida.

Puntualmente veremos:

- Autenticación
- Autorización
- Json Web Tokens
- Hash de contraseñas
- Nest Passport
- Módulos asíncronos
- Protección de rutas
- Custom Method Decorators
- Custom Class Decorators
- Custom Property Decorators
- Enlazar usuarios con productos
- Bearer Tokens
- Y mucho más

## Continuación de proyecto

Vamos a seguir usando el proyecto de la sección anterior, por lo que podemos usar el siguiente comando para copiarlo:

```txt
$: cp -r 12-Carga_archivos/teslo-shop 13-Autenticacion_de_autorizacion/
```

Hacemos la instalación de los `node_modules` con el siguiente comando:

```txt
$: pnpm install
```

Levantamos la base de datos con el comando:

```txt
$: docker-compose up -d
```

Y levantamos el proyecto con el siguiente comando:

```txt
$: pnpm start:dev
```

En caso de no tener registros en la base de datos, vamos a ejecutar el siguiente endpoint: `http://localhost:3000/api/seed`

## Entidad de Usuarios

Necesitamos una entidad de usuarios para controlar la creación y actualización de los productos, además de que es indispensable para la autenticación y autorización de los mismos. Vamos a crear un nuevo recurso con el siguiente comando:

```txt
$: nest g res auth --no-spec
? What transport layer do you use? REST API
? Would you like to generate CRUD entry points? Yes
```

Dentro de la entidad de autenticación vamos a realizar el siguiente cambio (también cambiamos el nombre del archivo a `user.entity.ts`):

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity( 'users' )
export class User {
    @PrimaryGeneratedColumn( 'uuid' )
    id: string

    @Column( 'text', {
        unique: true
    } )
    email: string

    @Column( 'text' )
    password: string

    @Column( 'text' )
    fullName: string

    @Column( 'bool', {
        default: true
    } )
    isActive: boolean

    @Column( {
        type: 'text',
        array: true,
        default: [ 'user' ]
    } )
    roles: string[]
}
```

Ahora, para que TypeORM reconozca esta entidad como una tabla dentro de la base de datos, debemos ir al archivo `auth.module.ts` para realizar la siguiente importación y configuración:

```ts
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
...
@Module( {
    imports: [
        TypeOrmModule.forFeature( [
            User
        ] ),
    ],
    ...
} )
export class AuthModule { }
```

Como tenemos activa la función de sincronización, vamos a observar los cambios una vez guardado el proyecto y recargado el gestor la bases de datos. En caso de estar en producción se debe trabajar con migraciones.

## Crear usuario

Para crear un usuario, vamos a definir un nuevo endpoint que reciba un body con una estructura definida por nosotros. Dicha estructura la especificamos en el archivo `create-user.dto.ts`:

```ts
import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateUserDTO {
    @IsString()
    @IsEmail()
    email: string

    @IsString()
    @MinLength( 6 )
    @MaxLength( 50 )
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    } )
    password: string

    @IsString()
    @MinLength( 1 )
    fullName: string
}
```

Ahora, dentro del controlador definimos el método para el registro del usuario:

```ts
import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { CreateUserDTO } from './dto/create-user.dto'

@Controller( 'auth' )
export class AuthController {
    constructor ( private readonly authService: AuthService ) { }

    @Post( 'register' )
    register ( @Body() createUserDto: CreateUserDTO ) {
        return this.authService.create( createUserDto )
    }
}
```

Lo siguiente es definir la lógica del servicio, para crear el usuario y retornar la data creada:

```ts
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateUserDTO } from './dto/create-user.dto'
import { User } from './entities/user.entity'
...
@Injectable()
export class AuthService {
    ...
    constructor ( @InjectRepository( User ) private readonly _userRepository: Repository<User> ) { }

    async create ( createUserDto: CreateUserDTO ) {
        try {
            const user = this._userRepository.create( createUserDto )
            await this._userRepository.save( user )
            return user
        } catch ( error ) {
            this._handleDBException( error )
        }
    }
    ...
}
```

Algo que podemos mejorar es el no recrear el método `_handleDBException` en todos los servicios, más bien, podemos crear un servicio dentro del módulo `commons`, exportarlo e importarlo en lo módulos que requieran controlar los errores que se deban a la base de datos. Para esto usaremos el siguiente comando:

```txt
$: nest g s commons/services/db-exception --no-spec --flat
```

Exportamos el servicio:

```ts
import { DBExceptionService } from './services/db-exception.service'
...
@Module( {
    providers: [ DBExceptionService ],
    exports: [ DBExceptionService ]
} )
export class CommonsModule { }
```

Creamos el método dentro del servicio, y como plus vamos a definir que el método nunca retorna nada mediante el tipo `never`, y mediante el modificador de acceso `static` lograremos que no tengamos que importarlo todo el servicio en cada módulo:

```ts
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { PostgreSQLErrorCodes } from '../enums/db-error-codes.enum'

@Injectable()
export class DBExceptionService {
    private static logger = new Logger( 'DBExceptionService' )

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

Ahora usamos el método dentro de los servicios que lo requieran, hasta el momento el módulo de usuarios y de productos:

```ts
import { DBExceptionService } from 'src/commons/services/db-exception.service'
...
@Injectable()
export class AuthService {
    async create ( createUserDto: CreateUserDTO ) {
        try { ... } catch ( error ) {
            DBExceptionService.handleDBException( error )
        }
    }
}
```

## Encriptar la contraseña

Debemos evitar que la contraseña sea retornada en las consultas, y además deben estar encriptadas dentro de la base de datos, usando hash de 1 sola vía para evitar su revelación forzada. Usaremos el paquete `bcrypt` ejecutando los siguiente comandos:

```txt
$: pnpm i -S bcrypt
$: pnpm i -D @types/bcrypt
```

Dentro del servicio llamamos el paquete y usamos el método `hashSync` para encriptar la contraseña al momento de guardar el registro:

```ts
import * as bcrypt from 'bcrypt'
...
@Injectable()
export class AuthService {
    ...
    async create ( createUserDto: CreateUserDTO ) {
        try {
            const { password, ...userData } = createUserDto
            const user = this._userRepository.create( {
                ...userData,
                password: bcrypt.hashSync( password, 10 )
            } )
            await this._userRepository.save( user )
            return user
        } catch ( error ) { ... }
    }
}
```

De esta manera cada que se registre un nuevo usuario, se va a encriptar la contraseña dentro de la base de datos, pero el problema es que se está retornando el hash dentro de la respuesta. Una manera sencilla es usando `delete` sobre el objeto que se va retornar, luego aplicaremos una mejor estrategia:

```ts
@Injectable()
export class AuthService {
    ...
    async create ( createUserDto: CreateUserDTO ) {
        try {
            ...
            await this._userRepository.save( user )
            delete user.password
            return user
        } catch ( error ) { ... }
    }
}
```

## Login de usuario

Es momento de redactar el método del login. Iniciamos definiendo el DTO para el body de la petición (Importante, no lo extendemos como tipo parcial del DTO de registro, por que queremos que todas las propiedades sean requeridas):

```ts
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class LoginUserDTO {
    @IsString()
    @IsEmail()
    email!: string

    @IsString()
    @MinLength( 6 )
    @MaxLength( 50 )
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    } )
    password!: string
}
```

Seguimos con la creación del punto de entrada en el controlador:

```ts
import { LoginUserDTO } from './dto/login-user.dto'
...
@Controller( 'auth' )
export class AuthController {
    ...
    @Post( 'login' )
    login ( @Body() loginUserDto: LoginUserDTO ) {
        return this.authService.login( loginUserDto )
    }
}
```

En este punto es importante que tengamos en cuenta el no mostrar la contraseña en cualquier consulta hacía la tabla de usuarios, por lo que para evitar esta falla de seguridad, la vamos a excluir dentro de la configuración de la entidad:

```ts
@Entity( 'users' )
export class User {
    ...
    @Column( {
        type: 'text',
        select: false
    } )
    password: string;
    ...
}
```

Ahora, definimos el servicio, en donde desestructuramos la información que recibe, para luego buscar el usuario mediante su email, pero en este caso si necesitamos el password para hacer la comparación entre la que se ingresa y la existente en el registro. En caso de que no se encuentre el usuario retornamos un status 401, pero si todo sale bien, retornamos el usuario por ahora:

```ts
@Injectable()
export class AuthService {
    ...
    async login ( loginUserDto: LoginUserDTO ) {
        const { email, password } = loginUserDto;

        const user = await this._userRepository.findOne( {
            where: { email },
            select: { email: true, password: true }
        } );

        if ( !user || !bcrypt.compareSync( password, user.password ) )
            throw new UnauthorizedException( 'Invalid credentials' );

        return user;
    }
}
```

## Nest Authentication Passport

Vamos a usar la estrategia de autenticación que nos provee Nest, por lo que haremos una instalación del paquete `passport` y su adaptador en nest, con el siguiente comando:

```txt
$: pnpm i @nestjs/passport passport
```

Cómo también usaremos JWT necesitamos otra instalación:

```txt
$: pnpm i -S @nestjs/jwt passport-jwt
$: pnpm i -D @types/passport-jwt
```

Dentro del decorador de definición del módulo de autenticación, realizamos un registro de la estrategia `jwt` para el passport, y configuramos algunas parte del token que se genere:

```ts
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
...
@Module( {
    imports: [
        ...,
        PassportModule.register( { defaultStrategy: 'jwt' } ),
        JwtModule.register( {
            secret: process.env.JWT_SECRET,
            signOptions: {
                expiresIn: '2h'
            }
        } )
    ],
    ...
} )
export class AuthModule { }
```

El inconveniente que se puede presentar, es que las variables de entorno aún no hayan sido reconocidas al momento de levanter el proyecto, y por lo tanto nuestro registro del módulo JWT sea fallido. En este caso tenemos la opción de hacer el registro asíncrono.

## Módulos Asíncronos

Cuando registramos un módulo de manera asíncrona tenemos la oportunidad de hacer inyecciones dentro del mismo, algo muy útil para nosotros, ya que reemplazaremos el uso de `process.env` por una instancia de `ConfigService`. Mediante la propiedad `useFactory` creamos una función anónima para establecer la configuración que teníamos anteriormente:

```ts
@Module( {
    imports: [
        ...,
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
            },
        } )
    ],
    ...
} )
export class AuthModule { }
```

## JwtStrategy

Cuando recibamos el JWT, debemos identificar el usuario al cual le pertenece. Un JWT consta de un header que define el algoritmo y el tipo de token, el objeto payload que contiene la data principal que guardamos dentro del token, y un verify signature en donde se valida la firma y validez del token.

Vamos a crear un nuevo archivo llamado `auth/strategies/jwt.strategy.ts`, y dentro de este archivo creamos una clase que extiende de `PassportStrategy`. En esta clase creamos un método para validar el payload del JWT, y que retornará un usuario una vez aplicada la validación.

```ts
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { User } from "../entities/user.entity";
import { IJwtPayload } from "../interfaces/jwt-payload.interface";

export class JwtStrategy extends PassportStrategy( Strategy ) {
    async validate ( payload: IJwtPayload ): Promise<User> {
        const { email } = payload;
        return;
    }
}
```

## JwtStrategy - Parte 2

Vamos a validar que el contenido del payload contenga un email valido, por lo que necesitamos buscar el usuario y para ello inyectamos el servicio de usuarios, lo cual nos obliga a traer las propiedades de la clase padre, por lo que vamos a aprovechar y definir algunas propiedades más, tales como la llave secreta y que el token sea de tipo Bearer Token. En caso de que no se encuentre el usuario por su email, o que se encuentre inactivo, retornamos un status 401:

```ts
import { ExtractJwt, ... } from "passport-jwt";
import { User } from "../entities/user.entity";
import { Repository } from 'typeorm';
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from '@nestjs/config';
...

export class JwtStrategy extends PassportStrategy( Strategy ) {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        _configService: ConfigService
    ) {
        super( {
            secretOrKey: _configService.get( 'JWT_SECRET' ),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        } );
    }

    async validate ( payload: IJwtPayload ): Promise<User> {
        const { email } = payload;

        const user = await this._userRepository.findOneBy( { email } );

        if ( !user ) throw new UnauthorizedException( 'Token not valid' );

        if ( !user.isActive ) throw new UnauthorizedException( 'User is inactive, talk with an admin' );

        return user;
    }
}
```

Con el anterior método logramos que la información del usuario ya se encuentre disponible en la Request, y que posteriormente podamos acceder a la misma mediante interceptors y decoradores. Ahora, debemos definir que nuestra clase sea un provider mediante el decorador `@Injectable()`:

```ts
import { Injectable, ... } from '@nestjs/common';
...
@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {...}
```

Luego lo proveemos dentro del módulo de autenticación, y también lo exportaremos por qué puede que se necesite en cualquier otro lugar para validar el token, pero también vamos a exportar la configuración del módulo de passport y JWT:

```ts
import { JwtStrategy } from './strategies/jwt.strategy';
...
@Module( {
    ...,
    providers: [ ..., JwtStrategy ],
    exports: [ ..., JwtStrategy, PassportModule, JwtModule ]
} )
export class AuthModule { }
```

## Generar un JWT

Hay 2 lugares donde debemos retornar el JWT, al momento del registro y al momento del login, por lo que vamos a crear un método privado dentro del servicio de autenticación, el cual usará una inyección del `JwtService` que ya tenemos gracias a la importación del `JwtModule`:

```ts
import { JwtService } from '@nestjs/jwt';
...

@Injectable()
export class AuthService {
    constructor (
        ..., private readonly _jwtService: JwtService
    ) { }

    async create ( createUserDto: CreateUserDTO ) {
        try {
            ...
            return {
                token: this._getJwtToken( { email: user.email } ),
                user
            };
        } catch ( error ) { ... }
    }

    async login ( loginUserDto: LoginUserDTO ) {
        ...
        return {
            token: this._getJwtToken( { email: user.email } ),
            user
        };
    }

    private _getJwtToken ( payload: IJwtPayload ) {
        return this._jwtService.sign( payload );
    }
}
```

Antes de avanzar, vamos a realizar una modificación al campo de correo, puesto que queremos que siempre se guarde en minúsculas:

```ts
import { BeforeInsert, BeforeUpdate, ... } from 'typeorm';

@Entity( 'users' )
export class User {
    ...
    @BeforeInsert()
    @BeforeUpdate()
    checkFieldsBeforeInsertOrUpdate () {
        this.email = this.email.toLowerCase().trim();
    }
}
```

## Private Route - General

Mediante los Guards logramos permitir o prevenir el acceso a una ruta, aquí es donde se debe autorizar una solicitud. Para usar un guard usamos el decorador `@UseGuards()`, ya sea a nivel de método, controlador o módulo, pero en este caso lo haremos a nivel del endpoint, y usamos el Guard de autenticación definido por el propio paquete de `@nest/passport`:

```ts
import { ..., UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
...
@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing' )
    @UseGuards( AuthGuard() )
    testingPrivateRoute () {
        return {
            ok: true,
            message: 'Ruta privada'
        };
    }
}
```

Cuando hacemos la request, debemos añadir dentro de los headers la propiedad `Authorization` con el valor de `Bearer <token>`, para que nuestro servidor de acceso a la función del endpoint, por que de caso contrario tendremos un error 401. Este Guard hace uso de manera implícita de la función de validación que definimos en la estrategia.

## Cambiar email por id en el Payload

Hay un pequeño problema con el payload del token, puesto que estamos usando el email que contiene para realizar la consulta dentro de la base de datos y validar el token, pero cuando cambiamos el correo electrónico, nuestro token será invalido. Para controlar esto debemos actualizar la interfaz del payload:

```ts
export interface IJwtPayload {
    id: string;
}
```

Luego actualizamos el método de validación para extraer el id en reemplazo del email:

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {
    ...
    async validate ( payload: IJwtPayload ): Promise<User> {
        const { id } = payload;
        const user = await this._userRepository.findOneBy( { id } );
        ...
    }
}
```

Por último, vamos a los métodos de registro y login en el servicio, para actualizar la información que guarda el payload, pero en el caso del login, necesitamos añadir la propiedad `id` dentro de la consulta `select`:

```ts

@Injectable()
export class AuthService {
    ...
    async create ( createUserDto: CreateUserDTO ) {
        try {
            ...
            return {
                token: this._getJwtToken( { id: user.id } ),
                user
            };
        } catch ( error ) { ... }
    }

    async login ( loginUserDto: LoginUserDTO ) {
        ...
        const user = await this._userRepository.findOne( {
            where: { email, },
            select: { id: true, email: true, password: true }
        } );
        ...
        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }
    ...
}
```

## Custom Property Decorator - GetUser

Vamos a obtener el usuario de las rutas en las que está autenticado. En este caso necesitamos un decorador a nivel de propiedad, el cual no es provisto por el CLI de Nest. Una posible solución para obtener el usuario sería usar el decorador `@Req()` para obtener todo el objeto de la petición, y luego extraer el usuario:

```ts
import { ..., Req } from '@nestjs/common';
...
@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing' )
    @UseGuards( AuthGuard() )
    testingPrivateRoute ( @Req() request: Express.Request ) {
        console.log( { user: request.user } );
        ...
    }
}
```

Ahora bien, si la petición no pasa por el `AuthGuard()`, la petición no tendrá la instancia del usuario y por lo tanto si llegamos a usar la propiedad `user` obtendremos un error. Con esto en mente, creamos un decorador personalizado dentro de `auth/decorators/get-user.decorator.ts`. En este decorador decorador recibimos la data que se se enviará al momento de usar el decorador, y el contexto bajo el cual se está ejecutando. Aprovechando el contexto, obtenemos la request y posteriormente el usuario, el cual si no existe en la data, será un error del lado del backend por qué estamos solicitando dicha propiedad, pero no la hemos guardado mediante el decorador de autenticación. Finalmente el decorador retorna el usuario:

```ts
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator( ( data, ctx: ExecutionContext ) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if ( !user ) throw new InternalServerErrorException( 'User not found in request' );

    return user;
} );
```

Para usar el custom property decorator, vamos al controlador y añadimos lo siguiente dentro de los parámetros de la función:

```ts
import { GetUser } from './decorators/get-user.decorator';
...
@Controller( 'auth' )
export class AuthController {
    ...
    testingPrivateRoute ( @GetUser() user: User ) {
        return {
            ok: true,
            message: 'Ruta privada',
            user
        };
    }
}
```

## Tarea: Custom Decorators

Para esta lección vamos a actualizar el decorador `@GetUser()` con el objetivo de que si recibe un string dentro de los parámetros, entonces, retorne el valor de la propiedad que tenga dicho nombre, pero en caso contrario, retorne todo el objeto del usuario.

Por ejemplo, si llamamos el decorador de la siguiente manera `GetUser() user: User`, obtendremos todo el objeto del usuario que se encuentra en la request, pero si se usa de la siguiente manera `GetUser( 'email' ) email: string`, obtendríamos el valor del correo que le pertenece al usuario.

Para lograr lo anterior modificamos el decorador añadiendo una validación para el caso en el que tenga data al momento de ser llamado.

```ts
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator( ( data: string, ctx: ExecutionContext ) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if ( !user ) throw new InternalServerErrorException( 'User not found in request' );

    return ( !data ) ? user : user[ data ];
} );
```

Ahora podemos llamarlo en el controlador de la siguiente manera:

```ts
@Controller( 'auth' )
export class AuthController {
    ...
    testingPrivateRoute ( @GetUser() user: User, @GetUser( 'email' ) email: string ) {
        return {
            ...,
            user,
            email
        };
    }
}
```

Como segunda tarea vamos a crear un custom decorators que se encargue de extraer y retornar los `rawHeaders` de la petición que se está realizando.

Lo primero que haremos es crear el archivo decorador dentro de `auth/decorators/` y lo llamaremos `raw-headers.decorator.ts`. Dentro del archivo añadimos el siguiente código:

```ts
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const RawHeaders = createParamDecorator( ( data, ctx: ExecutionContext ) => {
    const request = ctx.switchToHttp().getRequest();
    const rawHeaders = request.rawHeaders;

    if ( !rawHeaders ) throw new InternalServerErrorException( 'Raw Headers not found in the request' );

    return rawHeaders;
} );
```

En el controlador llamamos el decorador de la siguiente manera para obtener un arreglo de strings con los headers en formato raw:

```ts
@Controller( 'auth' )
export class AuthController {
    ...
    testingPrivateRoute ( @RawHeaders() rawHeaders: string[], ... ) {
        return {
            ...,
            rawHeaders
        };
    }
}
```

Aunque lo anterior sea muy útil para practicar la creación de custom decorators, ya contamos con decorator en Nest para extraer los headers de la petición en formato de objeto, y se usa de la siguiente manera:

```ts
import { ..., Headers  } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http2';
...

@Controller( 'auth' )
export class AuthController {
    ...
    testingPrivateRoute ( @Headers() headers: IncomingHttpHeaders, ... ) {
        return {
            ...,
            headers
        };
    }
}
```

## Custom Guard

Vamos a crear un nuevo método GET dentro de la autenticación (luego lo eliminaremos, ya que solo es para fines prácticos). Lo siguiente será crear un custom guard que nos ayude a validar si el usuario cuenta con un rol permitido para ejecutar el endpoint, dicho elemento lo podemos crear con el siguiente comando:

```txt
$: nest g gu auth/guards/user-role --no-spec --flat
```

Tendremos como base el siguiente código generado por el CLI de Nest:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class UserRoleGuard implements CanActivate {
    canActivate (
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        return true;
    }
}
```

La manera de usar el guard dentro del nuevo endpoint es la siguiente:

```ts
import { AuthGuard } from '@nestjs/passport';
import { UserRoleGuard } from './guards/user-role.guard';

@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing-2' )
    @UseGuards( AuthGuard(), UserRoleGuard )
    privateRoute2 ( ... ) { ... }
}
```

Debemos aclarar que `AuthGuard()` es una función que regresa un tipo, mientras que `UserRoleGuard` es una clase por lo que no debemos crear una instancia nueva y más bien usamos un especie de singleton. Los Guards se encuentran dentro de la exception zone del ciclo de ejecución de Nest, por lo que puede lanzar excepciones en la respuesta.

En nuestro caso necesitamos validar que el usuario tenga ciertos roles, los cuales deben ser definidos en la metadata del método:

```ts
import { ..., SetMetadata } from '@nestjs/common';
...

@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing-2' )
    @SetMetadata( 'roles', [ 'user', 'admin' ] )
    @UseGuards( AuthGuard(), UserRoleGuard )
    privateRoute2 ( ... ) { ... }
}
```

Ahora, dentro del guard leemos dicha metadata para controlar el paso a la ejecución del endpoint, para lo cual usamos una instancia de `Reflector`, con el cual podemos extraer la información almacenada dentro de la metadata de la petición.:

```ts
import { Reflector } from '@nestjs/core';
...

@Injectable()
export class UserRoleGuard implements CanActivate {
    constructor ( private readonly _reflector: Reflector ) { }

    canActivate (
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const validRoles: string[] = this._reflector.get( 'roles', context.getHandler() );

        return true;
    }
}
```

## Verificar rol del usuario

En la anterior lección vimos como se extrae la información de los roles desde la metadata configurada en el controlador, ahora necesitamos comparar el rol del usuario con los roles que tienen permitido la ejecución del endpoint.

Lo primero será extraer la información del usuario dentro de la request, la cual es guardada en la petición por el guard `AuthGuard()`. Si no existe, retornamos un error, y si ninguno de los roles del usuario coinciden con alguno de los roles definidos en la metadata, retornamos un código de error 403.

```ts
@Injectable()
export class UserRoleGuard implements CanActivate {
    constructor ( private readonly _reflector: Reflector ) { }

    canActivate (
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const validRoles: string[] = this._reflector.get( 'roles', context.getHandler() );

        const user: User = context.switchToHttp().getRequest().user;

        if ( !user )
            throw new BadRequestException( 'User not found' );

        for ( const role of user.roles ) {
            if ( validRoles.includes( role ) ) return true;
        }

        throw new ForbiddenException( `User '${ user.fullName }' need a valid role: [${ validRoles }]` );
    }
}
```

También vamos a controlar el caso en que no haya roles en la metadata, o que tenga un arreglo vacío, en cuyo caso nuestro controlador debe permitir el avance del usuario:

```ts
@Injectable()
export class UserRoleGuard implements CanActivate {
    ...
    canActivate (
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const validRoles: string[] = this._reflector.get( 'roles', context.getHandler() );

        if ( !validRoles || !validRoles.length ) return true;
        ...
    }
}
```

## Custom Decorator - RoleProtected

Para evitar la volatilidad al momento de escribir el nombre de la propiedad dentro de la metadata, podemos crear una constante que sea llamada dentro del `SetMetadata` como el custom guard de la lección anterior, los mismo para el nombre de los roles.

Lo primero que haremos será crear un decorador usando el siguiente comando:

```txt
$: nest g d auth/decorators/role-protected --no-spec --flat
```

El código base para el decorador será el siguiente:

```ts
import { SetMetadata } from '@nestjs/common';

export const RoleProtected = (...args: string[]) => SetMetadata('role-protected', args);
```

Ahora, creamos una constante que nos ayude a mantener el mismo string del nombre de propiedad en la metadata:

```ts
export const META_ROLES = 'roles';
```

```ts
export const RoleProtected = ( ...args: string[] ) => SetMetadata( META_ROLES, args );
```

```ts
@Injectable()
export class UserRoleGuard implements CanActivate {
    ...
    canActivate ( ... ): boolean | Promise<boolean> | Observable<boolean> {
        const validRoles: string[] = this._reflector.get( META_ROLES, context.getHandler() );
        ...
    }
}
```

También vamos a crear un enum que nos sirva de constante para los roles disponibles:

```ts
export enum ValidRoles {
    ADMIN = "admin",
    SUPERUSER = "superuser",
    USER = "user"
}
```

De esta manera controlamos los argumentos que pueden entrar por nuestro nuevo decorador `RoleProtected`:

```ts
import { SetMetadata } from '@nestjs/common';
import { META_ROLES, ValidRoles } from '../constants';

export const RoleProtected = ( ...args: ValidRoles[] ) => SetMetadata( META_ROLES, args );
```

Es momento de usar este decorador dentro del controlador, reemplazando la línea de `SetMetadata`:

```ts
@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing-2' )
    @RoleProtected( ValidRoles.ADMIN, ValidRoles.SUPERUSER )
    @UseGuards( AuthGuard(), UserRoleGuard )
    privateRoute2 ( @GetUser() user: User ) { ... }
}
```

## Composición de Decoradores

En estos momentos estamos usando varios decoradores dentro de un único método, y con estos estamos haciendo los procesos de autenticación (`AuthGuard`) y autorización (`UserRoleGuard`). La intención de la composición de decoradores, es poder centralizar todo el proceso de varios decoradores en solo un decorador.

Para esta lección vamos a crear una nueva ruta de ejemplo para usar el mismo proceso de las últimas lecciones, pero usando del concepto de composición de decoradores. Vamos a crear un custom decorator de manera manual dentro del módulo de autenticación:

```ts
import { UseGuards, applyDecorators } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ValidRoles } from "../constants";
import { UserRoleGuard } from "../guards/user-role.guard";
import { RoleProtected } from "./role-protected.decorator";

export function Auth ( ...roles: ValidRoles[] ) {
    return applyDecorators(
        RoleProtected( ...roles ),
        UseGuards( AuthGuard(), UserRoleGuard )
    );
}
```

Ahora, podemos usar el nuevo decorador dentro del controlador:

```ts
import { Auth, ... } from './decorators';
...

@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'private-testing-3' )
    @Auth( ValidRoles.ADMIN, ValidRoles.SUPERUSER )
    privateRoute3 ( @GetUser() user: User ) { ... }
}
```

En caso de que necesitemos añadir o remover decoradores para el proceso de autenticación, solo tendremos que realizar la modificación dentro del custom decorador `Auth()`.

## Auth en otros módulos

En estos momentos solo estamos usando el decorador de autenticación dentro del módulo `auth`, la intención es que también lo podamos usar en otros módulos, como por ejemplo en el `seed` en el método `executeSeed()`:

```ts
import { ValidRoles } from '../auth/constants';
import { Auth } from '../auth/decorators';
...

@Controller( 'seed' )
export class SeedController {
    ...
    @Get()
    @Auth( ValidRoles.ADMIN )
    executeSeed () {
        return this.seedService.runSeed();
    }
}
```

El problema con esto es que obtenemos el siguiente error en la consola: `In order to use "defaultStrategy", please, ensure to import PassportModule in each place where AuthGuard() is being used. Otherwise, passport won't work correctly.`

Para solucionar el error debemos importar el módulo de `AuthModule` dentro del `SeedModule`, ya que en el primero estamos realizando la importación de la configuración de `JwtStrategy` y `PassportModule`, los cuales son la fuente del error que se mostró anteriormente.

También podemos usar nuestro guard `Auth` a nivel de controlador y sin roles, a modo de que indiquemos que solo pedimos la autenticación y pueden ejecutar cualquiera de los endpoints del controlador sin importar su rol. Por ejemplo, con el controlador de productos (importante no olvidar importar el módulo `AuthModule` dentro de `ProductModule`):

```ts
@Controller( 'products' )
@Auth()
export class ProductsController {
    ...
}
```

## Usuario que creó el producto

Vamos a crear una relación entre los productos y los usuarios, buscando registrar cual fue el usuario que creo un producto. Un usuario puede crear muchos productos, pero un producto solo puede tener un 1 usuario creador, es decir, que tenemos una relación 1:n. Lo primero será crear una propiedad dentro de `UserEntity`:

```ts
import { ..., OneToMany } from 'typeorm';

@Entity( 'users' )
export class User {
    ...
    @OneToMany( () => Product, ( product ) => product.user )
    products: Product[];
    ...
}
```

Luego, dentro de la entidad de productos hacemos la operación inversa de la relación de multiplicidad:

```ts
import { ..., ManyToOne } from "typeorm";
...

@Entity( { name: 'products' } )
export class Product {
    ...
    @ManyToOne( () => User, ( user ) => user.products )
    user: User;
    ...
}
```

Podemos configurar que de manera automática en cada consulta a los productos, se cargue el usuario que lo creo, y para ello añadimos la siguiente configuración:

```ts
@Entity( { name: 'products' } )
export class Product {
    ...
    @ManyToOne( () => User, ( user ) => user.products, { eager: true } )
    user: User;
    ...
}
```

Si hacemos la petición en estos momentos obtendremos un user null, ya que dentro del seed no hemos configurado un usuario para los productos que se crean en grupo.

## Insertar userId en los productos

Para crear los productos necesitamos estar autenticados (recordemos que esta restricción la configuramos en la lección [Auth en otros módulos](README.md#auth-en-otros-módulos)). Podremos obtener la información del usuario en la request con el custom decorator `GetUser` a nivel de propiedad de método, y que luego enviaremos al servicio:

```ts
@Controller( 'products' )
@Auth()
export class ProductsController {
    ...
    @Post()
    create ( @Body() createProductDto: CreateProductDto, @GetUser() user: User ) {
        return this.productsService.create( createProductDto, user );
    }
    ...
}
```

Dentro del servicio vamos a actualizar el método para que pueda recibir el parámetro y aceptarlo en la nueva información. También aplicamos la misma estrategia al momento de actualizar:

```ts
@Injectable()
export class ProductsService {
    ...
    async create ( createProductDto: CreateProductDto, user: User ) {
        try {
            ...
            const product = this._productRepository.create( {
                ...productDetails,
                user,
                images: images.map( url => this._productImageRepository.create( { url } ) )
            } );
            ...
        } catch ( error ) { ... }
    }
    ...
    async update ( id: string, updateProductDto: UpdateProductDto, user: User ) {
        ...
        try {
            ...
            product.user = user;
            ...
        } catch ( error ) { ... }
    }
    ...
}
```

Temporalmente vamos a ignorar la lógica de creación de productos dentro del seed, con el fin de evitar el error que más adelante trataremos.

## SEED de usuarios, productos e imágenes

Necesitamos corregir el seed, el cual es destructivo ya que elimina los datos anteriores e insertar un grupo nuevo. Lo primero es definir el orden de creación de los datos, en este caso, necesitamos insertar primero los usuarios antes que los productos, para ello, inyectamos el repositorio de usuarios:

```ts
@Injectable()
export class SeedService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        ...
    ) { }
    ...
}
```

Luego creamos un método para eliminar todos los productos y seguido los usuarios registrados, esto con el objetivo de respectar la restricción CASCADE al momento de la eliminación:

```ts
@Injectable()
export class SeedService {
    ...
    private async _deleteTables () {
        await this._productsService.deleteAllProducts();

        await this._userRepository
            .createQueryBuilder()
            .delete()
            .where( {} )
            .execute();
    }
    ...
}
```

El anterior método lo llamamos al principio de la función `runSeed()`:

```ts
@Injectable()
export class SeedService {
    ...
    async runSeed () {
        await this._deleteTables();
        await this._insertNewProducts();
        return 'Seed Executed';
    }
    ...
}
```

Dentro de la data que se usar para montar el seed, creamos una nueva interfaz para usuarios y que determinará la estructura del objeto dentro del seed:

```ts
interface SeedUser {
    email: string;
    fullName: string;
    password: string;
    roles: string[];
}

interface SeedData {
    users: SeedUser[];
    products: SeedProduct[];
}
```

Lo siguientes es crear datos de usuario falsos para montar en la data:

```ts
export const initialData: SeedData = {
    users: [
        {
            email: "test1@mail.com",
            fullName: "Test 1",
            password: "test123",
            roles: [ 'admin' ]
        },
        {
            email: "test2@mail.com",
            fullName: "Test 2",
            password: "test123",
            roles: [ 'admin', 'user' ]
        }
    ],
    products: [ ... ]
}
```

Volvemos al servicio y creamos un método para insertar los usuarios y que además retorne al primer usuario de la data, que usaremos dentro del objeto de productos:

```ts
@Injectable()
export class SeedService {
    ...
    private async _insertUsers () {
        const seedUsers = initialData.users;

        const users: User[] = [];

        seedUsers.forEach( user => {
            users.push( this._userRepository.create( user ) );
        } );

        const dbUsers = await this._userRepository.save( users );

        return dbUsers[ 0 ];
    }
    ...
}
```

En el método de ejecución del seed llamamos la nueva función para obtener el primer usuario y enviarlo como parámetro a la función de creación de productos:

```ts
@Injectable()
export class SeedService {
    ...
    async runSeed () {
        ...
        const adminUser = await this._insertUsers();
        await this._insertNewProducts( adminUser );
        ...
    }
    ...
}
```

Modificamos el método de creación de productos para admitir el usuario:

```ts
@Injectable()
export class SeedService {
    ...
    private async _insertNewProducts ( user: User ) {
        await this._productsService.deleteAllProducts();

        const seedProduts = initialData.products;

        const insertPromises = [];

        seedProduts.forEach( product => {
            insertPromises.push( this._productsService.create( product, user ) );
        } );

        await Promise.all( insertPromises );

        return;
    }
}
```

Cuando ejecutamos el seed, podremos observar que los nuevos productos cuentan con el id de un usuario, el cual fue creado en la misma ejecución del seed.

## Encriptar contraseña de los usuarios en el SEED

Hemos pasado la información en seco dentro del seed, por lo que podemos observar la contraseña de los usuarios dentro de la base de datos, y además no podrá hacer match al momento de realizar la autenticación. Para evitar lo anterior vamos a encriptar la contraseña del usuario:

```ts
import * as bcrypt from 'bcrypt';
...

@Injectable()
export class SeedService {
    ...
    private async _insertUsers () {
        ...
        seedUsers.forEach( user => {
            const { password, ...userData } = user;

            users.push( this._userRepository.create( {
                ...userData,
                password: bcrypt.hashSync( password, 10 )
            } ) );
        } );
        ...
    }
    ...
}
```

Otra solución, y quizás la más simple, es encriptar la contraseña directamente en la data del seed:

```ts
import * as bcrypt from 'bcrypt';
...
export const initialData: SeedData = {
    users: [
        {
            email: "test1@mail.com",
            fullName: "Test 1",
            password: bcrypt.hashSync( "test123", 10 ),
            role: [ 'admin' ]
        },
        {
            email: "test2@mail.com",
            fullName: "Test 2",
            password: bcrypt.hashSync( "test123", 10 ),
            role: [ 'admin', 'user' ]
        }
    ],
    products: [ ... ]
};
```

## Check AuthStatus

Vamos a recibir el JWT y retornar un nuevo token basado en el anterior, esto con el fin de poder mantener validado el usuario todo el tiempo de acción. Básicamente revalidamos la autenticación del usuario. Primero definimos el punto de llegada dentro del controlador:

```ts
@Controller( 'auth' )
export class AuthController {
    ...
    @Get( 'check-status' )
    @Auth()
    checkAuthStatus ( @GetUser() user: User ) {
        return this.authService.checkAuthStatus( user );
    }
}
```

Pasamos con el servicio y creamos el método:

```ts
@Injectable()
export class AuthService {
    ...
    checkAuthStatus ( user: User ) {
        return {
            token: this._getJwtToken( { id: user.id } ),
            user
        };
    }
    ...
}
```

Al momento de hacer la petición debemos enviar el token que actualmente tenga el usuario para poder saber si está autenticado y poder regenerar su token, de lo contrario obtendrá un status 401:

```txt
GET {{base_url}}/check-status
Authorization: Bearer {{token}}
```
