# Sección 04: DTOs y Validación de información

Esta sección terminaremos el POST, PATCH y DELETE de nuestro CRUD inicial, pero de forma puntual veremos:

- DTO (Data Transfer Object)
- Patch, Post, Delete
- Validaciones automáticas
- Class Validator
- Class Transformer
- Seguir el principio DRY (Don't repeat yourself)
- Algunos decoradores del Class Validator útiles

## Continuación del proyecto

Vamos a continuar con el proyecto de la lección anterior, por lo cual debemos tener en cuenta que podemos reconstruir los módulos de node con el comando:

```txt
$: pnpm install
```

Para levantar el proyecto en modo desarrollo usamos el siguiente comando:

```txt
$: pnpm start:dev
```

## Interfaces y UUID

En estos momentos podemos enviar lo que queramos desde el cliente hacía el backend, y el back no lo está ni validando ni usando. Lo primero que haremos es crear una interfaz para establecer una estructura común para los datos, dicha interfaz va a estar en el archivo `cars/interfaces/cars.interface.ts`:

```ts
export interface ICar {
    id: number
    brand: string
    model: string
}
```

Luego dentro del servicio definimos el tipo de dato para el arreglo:

```ts
export class CarsService {
    private _cars: ICar[] = [...]
    ...
}
```

Los id numéricos son comunes en bases de datos, pero es un tanto mejor trabajar con ids de tipo UUID (Universally Unique Identifier), por tal motivo vamos a instalar el paquete `uuid` con los siguientes comandos (el paquete está escrito en JS, pero tiene la disposición de tipado para TS):

```txt
$: pnpm i -S uuid
$: pnpm i -D @types/uuid
```

Cabe resaltar que ahora nuestra interfaz cambiara el tipo del id, de número pasará a string. Con el paquete listo, vamos a llamar el paquete dentro del servicio:

```ts
import { v4 as uuid } from 'uuid'
...

@Injectable()
export class CarsService {
    private _cars: ICar[] = [
        {
            id: uuid(),
            ...
        },
        ...
    ]
    ...
}
```

También debemos tener en cuenta que los parámetros en los métodos del controlador también deben cambiar el tipo que esperan, puesto que ya no queremos enteros sino una cadena de uuid, el cual vamos a validar mediante un ppe en la siguiente lección.

## Pipe - ParseUUIDPipe

Siempre debemos validar que la información que le enviamos a la base de datos sea información valida, por ello la relevancia de validar los params de las peticiones. En este caso vamos usar el pipe `ParseUUIDPipe` en los métodos del controlador en los que se requiere usar un id:

```ts
...
import { ..., ParseUUIDPipe } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', ParseUUIDPipe ) id: string ) {...}
    ...
}
```

En estos momentos estamos usando la versión 4 de UUID, y podemos especificar dicha versión dentro del pipe, pero en este caso necesitamos crear una instancia del pipe para establecer la configuración:

```ts
...
import { ..., ParseUUIDPipe } from '@nestjs/common'

@Controller( 'cars' )
export class CarsController {
    ...
    @Get( ':id' )
    getCarById ( @Param( 'id', new ParseUUIDPipe({ version: '4' }) ) id: string ) {...}
    ...
}
```

## DTO - Data Transfer Object

Actualmente en las peticiones de POST y PATCH están recibiendo un body de tipo any, debemos obligar al cliente de la api que envíe una estructura exacta de la data. Una manera de validar los datos es mediante los pipes, pero sería complicado por qué se tendrían muchos pipes, en cambio el concepto de DTO es más apropiado para nuestro problema. Creamos una clase que define la estructura de los datos, y aunque una interfaz puede parecer que también ayuda, con los DTOs definimos muchas reglas sobre los campos incluyendo la validación de los mismos.

Vamos a crear el archivo `cars/dto/create-car.dto.ts` en el cual tendremos lo siguiente (las propiedades son de tipo `readonly` puesto que no queremos que se pueda modificar durante una acción luego de ser enviada por el cliente):

```ts
export class CreateCarDTO {
    readonly brand!: string

    readonly model!: string
}
```

Ahora dentro del controlador, en el método de creación vamos a declarar que el body sea de tipo `CreateCarDTO`:

```ts
import { CreateCarDTO } from './dto/create-car.dto'
...

@Controller( 'cars' )
export class CarsController {
    ...
    @Post()
    createCar ( @Body() createCarDTO: CreateCarDTO ) {
        return {
            ok: true,
            method: 'POST',
            data: createCarDTO
        }
    }
    ...
}
```

Es importante aclarar que aún no hemos aplicado validaciones, solo creamos la clase base o guía.

## ValidationPipe - Class Validator y Transformer

Cada petición que se realiza al backend, debe tener una estructura e información valida. Tenemos un pipe llamado `ValidationPipe`, el cual trabaja de la mano de los paquetes de Class Validator y Class Transformer. Hay 4 lugares en donde podemos aplicar pipes: A nivel global de la aplicación, a nivel global del controlador, dentro de un método del controlador, o dentro de los decoradores de los parámetros de los métodos.

El primer caso en el que vamos a usar el `ValidationPipe` será en el método para la creación de un carro. Pero, primero vamos a instalar los 2 paquetes que mencionamos anteriormente:

```txt
$: pnpm i class-validator class-transformer
```

Luego dentro del controlador llamamos lo siguiente:

```ts
import { ..., UsePipes, ValidationPipe } from '@nestjs/common'
...

@Controller( 'cars' )
export class CarsController {
    ...
    @Post()
    @UsePipes( ValidationPipe )
    createCar ( @Body() createCarDTO: CreateCarDTO ) { ... }
    ...
}
```

Luego, dentro de clase DTO asignamos las validaciones que queremos:

```ts
import { IsString } from "class-validator"

export class CreateCarDTO {
    @IsString()
    readonly brand!: string

    @IsString()
    readonly model!: string
}
```

Como queremos validar la información que también se envía mediante el método de actualización, podríamos replicar la forma anterior:

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    @Post()
    @UsePipes( ValidationPipe )
    createCar ( @Body() createCarDTO: CreateCarDTO ) { ... }

    @Patch( ':id' )
    @UsePipes( ValidationPipe )
    updateCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string, @Body() body: any ) { ... }
    ...
}
```

Aunque parece una solución simple, tenemos uno más simple y que cumple con el principio DRY (Don't Repeat Yourself), y es declarando el uso del pipe de validación a nivel del controlador:

```ts
@Controller( 'cars' )
@UsePipes( ValidationPipe )
export class CarsController {
    ...
    @Post()
    createCar ( @Body() createCarDTO: CreateCarDTO ) { ... }

    @Patch( ':id' )
    updateCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string, @Body() body: any ) { ... }
    ...
}
```

Si tenemos más controladores tenemos una noticia genial, podemos mover el pipe de validación a nivel de aplicación.

## Pipes Globales - A nivel de aplicación

Vamos a remover la línea de uso de pipes que se encuentra a nivel de controlador, y ahora vamos al archivo `main.ts` y aplicar la siguiente configuración a nivel global:

```ts
async function bootstrap () {
    ...
    app.useGlobalPipes( new ValidationPipe() )
    ...
}
```

Cuando enviamos una petición que no contiene las propiedades que pedimos, tendremos el siguiente error, o si enviamos el tipo de dato equivocado:

```json
{
    "statusCode": 400,
    "message": [
        "brand must be a string",
        "model must be a string"
    ],
    "error": "Bad Request"
}
```

El inconveniente que tenemos ahora, es que nos pueden enviar información de más en nuestra petición, lo cual podría llegar a generar inconvenientes al momento de hacer la petición en la base de datos. Al momento de declarar el uso del pipe a nivel global nos brinda una solución, y es hacer uso de la propiedad `whitelist`, con la cual solo va enviar como data los elementos que están definidos en nuestro DTO:

```ts
async function bootstrap () {
    ...
    app.useGlobalPipes( new ValidationPipe( {
        whitelist: true
    } ) )
    ...
}
```

Si queremos ser más estrictos, e indicarle al cliente cuales datos no debe enviar, usamos la propiedad `forbidNonWhitelisted`:

```ts
async function bootstrap () {
    ...
    app.useGlobalPipes( new ValidationPipe( {
        whitelist: true,
        forbidNonWhitelisted: true
    } ) )
    ...
}
```

## Crear el nuevo carro

Vamos a crear un nuevo método dentro del servicio `CarService` con la intención de crear un nuevo carro:

```ts
export class CarsService {
    ...
    public create ( createCarDTO: CreateCarDTO ) {
        const newCar: ICar = { ...createCarDTO, id: uuid() }
        this._cars.push( newCar )
        return newCar
    }
}
```

Ahora lo llamamos dentro del controlador:

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    @Post()
    createCar ( @Body() createCarDTO: CreateCarDTO ) {
        const data = this._carsService.create( createCarDTO )
        return {
            ok: true, method: 'POST',
            data
        }
    }
    ...
}
```

Con lo anterior logramos crear un nuevo elemento dentro del arreglo con la data que se envió mediante el body, pero con un id de tipo UUID que se define al momento de enviar la nueva información al arreglo general.

## Actualizar un carro

Vamos a implementar la función de actualización. Lo primero que necesitamos es crear un DTO en el que definamos las propiedades del objeto que se espera y que son opcionales, para ello creamos el archivo `dto/update-car.dto.ts`. Hacemos esto, puesto que, no es necesario que nos envíen todo un objeto con solo unas pocas modificaciones, es preferible que solo nos envíen las propiedades necesarias:

```ts
import { IsOptional, IsString, IsUUID } from "class-validator"

export class UpdateCarDTO {
    @IsOptional()
    @IsString()
    @IsUUID()
    readonly id?: string

    @IsOptional()
    @IsString()
    readonly brand?: string

    @IsOptional()
    @IsString()
    readonly model?: string
}
```

Dentro del método del controlador vamos a definir el tipo de la data que esperamos recibir en la petición dentro del body de la misma:

```ts
import { UpdateCarDTO } from './dto/update-car.dto'
...

@Controller( 'cars' )
export class CarsController {
    ...
    @Patch( ':id' )
    updateCar ( ..., @Body() updateCarDTO: UpdateCarDTO ) { ... }
    ...
}
```

Podemos agrupar la exportación de los 2 clases DTOs dentro de un archivo `index.ts`, al cual llamamos archivo barril:

```ts
export { CreateCarDTO } from "./create-car.dto"
export { UpdateCarDTO } from './update-car.dto'
```

## Actualizar el listado de carros

Vamos a crear el método en el servicio para actualizar el carro:

```ts
@Injectable()
export class CarsService {
    ...
    public update ( id: string, updateCarDTO: UpdateCarDTO ) {
        let carData = this.findOneById( id )
        this._cars = this._cars.map( car => {
            if ( car.id === id ) {
                carData = { ...carData, ...updateCarDTO, id }
                return carData
            }
            return car
        } )
        return carData
    }
}
```

Luego llamamos este nuevo método dentro de la función del controlador:

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    @Patch( ':id' )
    updateCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string, @Body() updateCarDTO: UpdateCarDTO ) {
        const data = this._carsService.update( uuid, updateCarDTO )
        return {
            ok: true,
            method: 'PATCH',
            data
        }
    }
    ...
}
```

Ahora cuando hacemos la petición, debemos usar el id del elemento que queremos actualizar y posteriormente definir la(s) propiedad(es) que se deben actualizar. Cómo estamos permitiendo que se envíe el id dentro del Body, podemos hacer un control para validar que el tanto el que se recibe por parámetro, como el que se recibe por body, sean iguales:

```ts
import { BadRequestException, ... } from '@nestjs/common'
...

@Injectable()
export class CarsService {
    ...
    public update ( id: string, updateCarDTO: UpdateCarDTO ) {
        let carData = this.findOneById( id )

        if ( updateCarDTO.id && updateCarDTO.id !== id )
            throw new BadRequestException( `Car id is not valid inside body` )

        this._cars = this._cars.map( car => {
            if ( car.id === id ) {
                carData = { ...carData, ...updateCarDTO, id }
                return carData
            }
            return car
        } )

        return carData
    }
}
```

## Borrar un carro

Por últimos vamos a crear el último endpoint, la eliminación de un vehículo. Lo primero es definir el servicio:

```ts
import { ..., NotFoundException } from '@nestjs/common'
...

@Injectable()
export class CarsService {
    ...
    public delete ( id: string ) {
        const car = this.findOneById( id )
        if ( !car || !Object.keys( car ).length )
            throw new NotFoundException( `Car with id ${ id } not found` )

        this._cars = this._cars.filter( car => car.id !== id )

        return
    }
}
```

Y dentro del controlador solo llamamos el servicio:

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    @Delete( ':id' )
    deleteCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string ) {
        this._carsService.delete( uuid )

        return {
            ok: true,
            method: 'DELETE',
            id: uuid
        }
    }
}
```

Ahora bien, tenemos que refactorizar el código para aplicar el servicio DRY, puesto que la validación sobre el resultado del método de encontrar por id está siendo aplicada en dos lugares diferentes, y lo podemos centralizar en el método del servicio `findOneById` y limpiamos el código duplicado en los otros lugares:

```ts
@Injectable()
export class CarsService {
    ...
    public findOneById ( id: string ) {
        const car = { ...this._cars.find( car => car.id === id ) }
        if ( !car || !Object.keys( car ).length )
            throw new NotFoundException( `Car with id ${ id } not found` )
        return car
    }
    ...
    public delete ( id: string ) {
        const car = this.findOneById( id )
        
        this._cars = this._cars.filter( car => car.id !== id )

        return
    }
}
```

```ts
@Controller( 'cars' )
export class CarsController {
    ...
    Patch( ':id' )
    updateCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string, @Body() updateCarDTO: UpdateCarDTO ) {
        const data = this._carsService.update( uuid, updateCarDTO )
        return {
            ok: true,
            method: 'PATCH',
            data
        }
    }
    ...
}
```

Con lo anterior logramos tener una afectación en los métodos de obtener por id, actualizar y eliminar, tanto en controlador como en servicios.
