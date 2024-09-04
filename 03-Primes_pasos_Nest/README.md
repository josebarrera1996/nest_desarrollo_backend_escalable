# Sección 03: Primeros pasos en Nest

Estamos entrando a nuestra primera sección sobre Nest, aquí veremos:

- ¿Qué es Nest?
- ¿Por qué usarlo?
- Explicación sobre cada archivo en un proyecto nuevo de Nest
- Core Nest building blocks
  - Módulos
  - Controladores (Post, Patch, Get, Delete)
  - Primeros decoradores
  - Servicios
  - Inyección de dependencias
  - Pipes
  - Exception Filters

Adicionalmente estaremos creando un Rest Api inicial para ir explicando cada concepto paso a paso.

## ¿Qué es Nest? ¿Por qué usarlo?

Nest es un marco de trabajo dogmático (opinionated), en el cual se sigue una determinada nomenclatura, file system, etc. Su forma estructurada nos permite mantener una aplicación más ordenada y file de soportar. Nest permite crear aplicaciones del lado del servidor con NodeJS y TypeScript. Nest está fuertemente inspirado en Angular, pero no es necesario saber de uno para aprender sobre el otro.

## Instalar Nest CLI (Command Line Interface)

Para instalar Nest CLI podemos usar el siguiente comando:

```txt
$: pnpm i -g @nestjs/cli
```

Verificamos la versión de Nest con el comando:

```txt
$: nest --version
```

O en su versión más corta:

```txt
$: nest -v
```

## Generar nuestro primer proyecto - CarDealership

Vamos a crear nuestro primer proyecto en Nest, para lo cual usamos el siguiente comando:

```txt
$: nest new car-dealership
```

Seleccionamos el manejador de paquetes preferido (en mi caso pnpm), es esperamos el progreso de la instalación. Una vez se termine de crear el proyecto, nos dirigimos al directorio del mismo y lo levantamos en modo desarrollo con el comando:

```txt
$: pnpm start:dev
```

Por defecto Nest trabaja en el puerto 3000, por lo que podemos ir a `http://localhost:3000` y tener un mensaje de `Hello World!`. Cuando vayamos a modificar el código, si tenemos un formatter code diferente a Prettier, y no queremos que se generen conflictos con el linter por el formato, podemos personalizar las reglas del archivo `.prettierrc` o dentro del archivo `.eslintrc.js` eliminar la linea asociada con el formatter:

```js
module.exports = {
    ...,
    extends: [
        'plugin:@typescript-eslint/recommended',
        // 'plugin:prettier/recommended',
    ],
    ...,
};
```

## Explicación de cada archivo y directorio

- `.eslintrc.js`: Archivo de configuración de linter para aplicación de buenas prácticas recomendadas por los creadores de Nest, procurando seguir ciertos standards
- `.gitignore`: Archivo que nos permite ignorar ciertos archivos y directorios que no deben tener seguimiento en el repositorio.
- `.prettierrc`: Archivo de configuración del formatter code Prettier
- `nest-cli.json`: Configuraciones del CLI
- `package.json`: Configuraciones generales del proyecto, tales como nombre, versión, scripts, dependencias de producción y de desarrollo, y la configuración de jest.
- `tsconfig.build.json`: Archivo con las configuraciones de TypeScript para el build de producción
- `tsconfig.json`: Establece las reglas con las que TypeScript se debe regir
- `dist/`: Almacena el producto final para la ejecución en desarrollo, o en producción.
- `node_modules/`: Almacén de los paquetes necesarios para el proyecto
- `test/`: Conserva los archivos dedicados al testing.

## Módulos

Dentro del directorio `src/` tenemos múltiples archivos, pero los vamos a borrar por que vamos a crearlos desde ceros, excepto el `app.module.ts` al cual vamos a dejar de la siguiente manera:

```ts
import { Module } from '@nestjs/common'


@Module( {
    imports: [],
    controllers: [],
    providers: [],
    exports: []
} )
export class AppModule { }
```

Los módulos hacen parte de los ***Build Blocks***, y se encarga de agrupar y desacoplar un conjunto de funcionalidades específicas por dominio. En este caso `AppModule` es el módulo principal o root de la aplicación. Pese a ser una clase normal, logramos convertirlo en módulo mediante el decorador `@Module()`

El archivo `main.ts` tiene el punto de acceso principal de la aplicación, y en cual se crea el proyecto haciendo uso del módulo principal:

```ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'


async function bootstrap () {
    const app = await NestFactory.create( AppModule )
    await app.listen( 3000 )
}
bootstrap()
```

Como eliminamos el controlador y los servicios, los cuales se encargaban de la petición y respuesta a un endpoint, cuando levantemos la aplicación, vamos a tener un mensaje como el siguiente en el navegador:

```json
{
    "statusCode": 404,
    "message": "Cannot GET /",
    "error": "Not Found"
}
```

Normalmente hacemos las peticiones o pruebas de las mismas a través de un API Client como por ejemplo Postman, Thunder o RapidClient.

## Controladores

Los controladores se encargan de escuchar la solicitud a un endpoint y de emitir una respuesta. Para crear un controlador, podemos hacerlo de manera manual, creando un archivo, la clase asignarle el decorador, y luego enviar la referencia de la clase al módulo que lo contiene, o, lo podemos hacer mediante el CLI con el siguiente comando:

```txt
$: nest generate controller <nombre del controlador>
```

Para nuestro proyecto vamos a estar manejando una estructura de módulos, por lo que primero creamos un módulo con el siguiente comando (usare las comandos cortos):

```txt
$: nest g mo cars
```

Con el anterior comando creamos un directorio y dentro un archivo, el cual es llamado en la propiedad `imports` del decorador `@Module()` del módulo principal:

```ts
import { Module } from '@nestjs/common'
import { CarsModule } from './cars/cars.module';

@Module( {
    imports: [ CarsModule ]
} )
export class AppModule { }
```

Ahora, creamos un controlador dentro del nuevo módulo con el siguiente comando (al usar el mismo nombre del directorio y módulo, se va a crear el archivo dentro del directorio `cars` y se va a actualizar el archivo `cars.module.ts`):

```txt
$: nest g co cars
```

Una vez creado el archivo, podremos observar que en `cars.module.ts` tendremos lo siguiente:

```ts
import { Module } from '@nestjs/common'
import { CarsController } from './cars.controller'

@Module( {
    controllers: [ CarsController ]
} )
export class CarsModule { }
```

Y el controlador se verá inicialmente de la siguiente manera, y recordemos que se considera controlador gracias al decorador `@Controller()`:

```ts
import { Controller } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController { }
```

Si nos fijamos en el decorador, tenemos el string `cars`, lo cual significa que el controlador será llamado cada que el endpoint al que se le hace la petición contenga un segmento con dicho string, por ejemplo: `http://localhost:3000/cars`. Ahora, para definir una respuesta cuando se haga una petición GET a dicho endpoint definimos lo siguiente:

```ts
import { Controller, Get } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {

    @Get()
    getAllCars () {
        return [ 'Toyota', 'Honda', 'Jeep' ]
    }
}
```

## Obtener un carro por ID

Vamos a hacer una pequeña modificación al controlador de la lección anterior:

```ts
import { Controller, Get } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {

    private _cars = [ 'Toyota', 'Honda', 'Jeep' ]

    @Get()
    getAllCars () {
        return this._cars
    }
}
```

Ahora, vamos ha crear un método que nos regrese el elemento n del arreglo de carros cuando hagamos una petición al endpoint `http://localhost:3000/cars/n`:

```ts
import { Controller, Get, Param } from '@nestjs/common'


@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id' ) id: number ) {
        return {
            id,
            data: this._cars.at( id )
        }
    }
}
```

Por defecto cualquier query params será recibido como un string, pero podemos mapear el parámetro mediante un pipe llamado `ParseIntPipe`, siempre y cuando el valor se pueda convertir en un número:

```ts
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'


@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', ParseIntPipe ) id: number ) {
        return {
            id,
            data: this._cars.at( id )
        }
    }
}
```

## Servicios

En este momento la data está dentro del controlador, lo cual hace que no podamos inyectar de manera simple la información en otros lugares. Los servicios alojan la lógica de negocio de tal manera que sea reutilizable mediante inyección de dependencias, todos los servicios son providers, pero no todos los providers son servicios. Los providers son clases que se pueden inyectar como una dependencia, esto significa que puede crear varias relaciones entre si.

Para crear un servicio sin archivo de testing, usamos el siguiente acceso:

```txt
$: nest g s cars --no-spec
```

El archivo que se crea tiene la siguiente estructura:

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CarsService {}
```

Además, dentro del módulo `CarsModule` tenemos que el decorador se actualiza con lo siguiente:

```ts
...
import { CarsService } from './cars.service';

@Module( {
    ...,
    providers: [ CarsService ]
} )
export class CarsModule { }
```

Dentro del nuevo servicio vamos a mover la data de los carros:

```ts
@Injectable()
export class CarsService {
    private _cars = [
        {
            id: 1,
            brand: 'Toyota',
            model: 'Corolla'
        },
        {
            id: 2,
            brand: 'Honda',
            model: 'Civic'
        },
        {
            id: 3,
            brand: 'Jeep',
            model: 'Cherokee'
        }
    ]
}
```

Ahora que no tenemos la data en el controlador, vamos a tener varios errores ya que no reconoce de donde debe sacar la información. En la siguiente lección vamos a ver la inyección de dependencias.

## Inyección de dependencias

Para hacer la inyección del servicio, necesitamos definir una propiedad dentro del constructor del controlador:

```ts
@Controller( 'cars' )
export class CarsController {
    constructor ( private readonly _carsService: CarsService ) { }
    ...
}
```

Cómo la data está privada dentro del servicio, no podemos acceder a ella dentro del controlador, por lo tanto vamos a crear métodos en el servicios que nos permitan realizar acciones que sean llamadas por el controller:

```ts
@Injectable()
export class CarsService {
    ...
    public findAll () {
        return [ ...this._cars ]
    }

    public findOneById ( id: number ) {
        return { ...this._cars.find( car => car.id === id ) }
    }
}
```

Ahora dentro del controlador, las llamamos de la siguiente manera:

```ts
@Controller( 'cars' )
export class CarsController {

    constructor ( private readonly _carsService: CarsService ) { }

    @Get()
    getAllCars () {
        return this._carsService.findAll()
    }

    @Get( ':id' )
    getCarById ( @Param( 'id', ParseIntPipe ) id: number ) {
        return {
            id,
            data: this._carsService.findOneById( id )
        }
    }
}
```

## Pipes

Un Pipe transforma la data recibida en request, para asegurar un tipo, valor o instancia de un objeto. En estos momentos estamos validando que el id del parámetro que llega en la petición sea de tipo number, y lo estamos haciendo a través del pipe `ParseIntPipe`, el cual internamente tiene esta lógica:

```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseIntPipe = void 0;
const tslib_1 = require("tslib");
const injectable_decorator_1 = require("../decorators/core/injectable.decorator");
const optional_decorator_1 = require("../decorators/core/optional.decorator");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_error_by_code_util_1 = require("../utils/http-error-by-code.util");
/**
 * Defines the built-in ParseInt Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
let ParseIntPipe = class ParseIntPipe {
    constructor(options) {
        options = options || {};
        const { exceptionFactory, errorHttpStatusCode = http_status_enum_1.HttpStatus.BAD_REQUEST } = options;
        this.exceptionFactory =
            exceptionFactory ||
                (error => new http_error_by_code_util_1.HttpErrorByCode[errorHttpStatusCode](error));
    }
    /**
     * Method that accesses and performs optional transformation on argument for
     * in-flight requests.
     *
     * @param value currently processed route argument
     * @param metadata contains metadata about the currently processed route argument
     */
    async transform(value, metadata) {
        if (!this.isNumeric(value)) {
            throw this.exceptionFactory('Validation failed (numeric string is expected)');
        }
        return parseInt(value, 10);
    }
    /**
     * @param value currently processed route argument
     * @returns `true` if `value` is a valid integer number
     */
    isNumeric(value) {
        return (['string', 'number'].includes(typeof value) &&
            /^-?\d+$/.test(value) &&
            isFinite(value));
    }
};
ParseIntPipe = tslib_1.__decorate([
    (0, injectable_decorator_1.Injectable)(),
    tslib_1.__param(0, (0, optional_decorator_1.Optional)()),
    tslib_1.__metadata("design:paramtypes", [Object])
], ParseIntPipe);
exports.ParseIntPipe = ParseIntPipe;
```

Cómo podemos observar, hace la validación para saber si es un tipo número y luego hacer el parse, pero en caso contrario lanza un error como respuesta, con un status 400 o Bad Request. Recordar que lo estamos usando de la siguiente manera en el controlador:

```ts
...
import { ..., ParseIntPipe } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', ParseIntPipe ) id: number ) {
        ...
    }
}
```

## Exception Filters

Los Exception Filter hace parte de los Building Blocks y maneja los errores de código en mensajes de respuesta HTTP. Usualmente Nest ya incluye todos los casos de uso comunes, pero sse pueden expandir basado en las necesidades.

Vamos a usar el código de error 404, el cual se ve representado en el recurso `NotFoundException`, el cual aplicaremos en el caso de que no se encuentre un carro cuando hacen la petición de búsqueda por id:

```ts
...
import { ..., NotFoundException } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', ParseIntPipe ) id: number ) {
        const data = this._carsService.findOneById( id )

        if ( !data || !Object.keys( data ).length ) {
            throw new NotFoundException()
        }

        return {
            id,
            data
        }
    }
}
```

Al momento de enviar una petición con un id que no existe, tendremos la siguiente respuesta:

```json
{
    "statusCode": 404,
    "message": "Not Found"
}
```

Si queremos un mensaje más descriptivo podemos hacer lo siguiente:

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', ParseIntPipe ) id: number ) {
        ...
        if ( !data || !Object.keys( data ).length ) 
            throw new NotFoundException( `Car with id ${ id } not found` )
        ...
    }
}
```

Con ello obtenemos la siguiente respuesta:

```json
{
    "statusCode": 404,
    "message": "Car with id 6 not found",
    "error": "Not Found"
}
```

## Post, Patch y Delete

Vamos a terminar un CRUD en nuestro proyecto. Tanto para el método POST como el método PATCH, tenemos que recibir un body, para lo caul usamos el decorador `@Body()`, por ejemplo, sin hacer uso de servicios aún tendríamos algo como lo siguiente:

```ts
import { ..., Body, Patch, Post } from '@nestjs/common'
...

@Controller( 'cars' )
export class CarsController {
    ...
    @Post()
    createCar ( @Body() body: any ) {
        return {
            ok: true,
            body
        }
    }

    @Patch( ':id' )
    updateCar ( @Param( 'id', ParseIntPipe ) id: number, @Body() body: any ) {
        return {
            ok: true,
            id, body
        }
    }
}
```

Para el método DELETE hacemos algo similar:

```ts
import { ..., Delete } from '@nestjs/common'
...

@Controller( 'cars' )
export class CarsController {
    ...
    @Delete( ':id' )
    deleteCar ( @Param( 'id', ParseIntPipe ) id: number ) {
        return {
            ok: true,
            method: 'DELETE',
            id
        }
    }
}
```
