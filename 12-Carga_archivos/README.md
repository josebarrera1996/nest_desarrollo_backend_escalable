# Sección 12: Carga de archivos

En esta sección trabajaremos con la carga de archivos a nuestro backend. Idealmente recordar, que no es recomendado colocar archivos físicamente en nuestro backend, lo que se recomienda es subirlos y colocarlos en un hosting o servicio diferente.

Pero el conocimiento de tomar y ubicar el archivo en otro lugar de nuestro file system es bastante útil.

Aquí veremos validaciones y control de carga de cualquier archivo hacia nuestro backend.

## Continuación del proyecto

Vamos a seguir usando el proyecto de la sección anterior, por lo que podemos usar el siguiente comando para copiarlo:

```txt
$: cp -r 11-Relaciones_TypeORM/teslo-shop 12-Carga_archivos/
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

## Subir un archivo al backend

Para subir un archivo a nuestro backend usaremos el paquete `multer`, el cual ya se encuentra en la instalaciones de nest, pero necesitamos instalar sus tipos, para lo cual usamos el siguiente comando:

```txt
$: pnpm i -D @types/multer
```

Ya que la carga de archivos es muy flexible para otros módulos, crearemos un nuevo resource:

```txt
$: nest g res files --no-spec
? What transport layer do you use? REST API
? Would you like to generate CRUD entry points? No
CREATE src/files/files.controller.ts (210 bytes)
CREATE src/files/files.module.ts (247 bytes)
CREATE src/files/files.service.ts (89 bytes)
UPDATE src/app.module.ts (1082 bytes)
```

Dentro del controlador creamos un método con el verbo POST, con el fin de cargar los archivos. Este método hace uso de un decorador `@UseInterceptors` para poder interceptar la llamada al endpoint y usar el interceptor de archivos, para indicarle al método como se llama la propiedad en donde se carga el archivo. La función hace uso de un parámetro de tipo `Express.Multer.File` apoyándose en el decorador `@UploadedFile`:

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { FilesService } from './files.service'

@Controller( 'files' )
export class FilesController {
    constructor ( private readonly filesService: FilesService ) { }

    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file' ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) {
        return file
    }
}
```

Cuando usamos el endpoint `http://localhost:3000/api/files/product/` con una propiedad de tipo File en el body, obtenemos un status 201, y el archivo es cargado en un directorio temporal al que no tenemos acceso aún.

## Validar archivos

En estos momentos necesitamos validar el tipo de archivo que se puede cargar, y para ello hay diversas propiedades del objeto, y una de ellas es `mimetype`, la cual contiene la extensión del archivo.

Creamos un helper que se encarga de recibir la request, el archivo y una función callback. Determinamos que si el archivo no se encuentra o la extensión del archivo no se encuentra dentro de nuestra whitelist de extensión, entonces mediante el callback enviamos un error y no dejamos pasar el archivo. En caso contrario determinamos que el archivo puede seguir al método:

```ts
export const fileFilter = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {
    if ( !file ) return callback( new Error( 'File is empty' ), false )

    const fileExtension = file.mimetype
        .split( '/' )
        .at( 1 )

    const validExtensions = [ 'jpg', 'jpeg', 'png', 'gif' ]

    if ( validExtensions.includes( fileExtension ) ) return callback( null, true )

    return callback( null, false )
}
```

Este helper lo usamos dentro del interceptor `FileInterceptor`, en sus opciones locales con la configuración de Multer, el cual le envía los parámetros necesarios a nuestro helper:

```ts
@Controller( 'files' )
export class FilesController {
    ...
    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', {
        fileFilter: fileFilter
    } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) { ... }
}
```

Cuando no enviamos un archivo, o enviamos alguno con una extensión no permitida, recibimos un status 500, puesto que el archivo no está llegando al método del controlador y nosotros nos estamos controlando el error. En este caso aplicamos la siguiente corrección een el controller:

```ts
@Controller( 'files' )
export class FilesController {
    constructor ( private readonly filesService: FilesService ) { }

    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', {
        fileFilter: fileFilter
    } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) {
        if ( !file ) throw new BadRequestException( "Make sure that the file is an image" )
        return {
            fileName: file.originalname
        }
    }
}
```

## Guardar imagen en filesystem

Esta estrategia vamos a aplicar la estrategia de guardar el archivo en el filesystem, pero es importante resaltar que NO ES la mejor opción, puesto que se pueden subir archivos maliciosos al servidor y hacer vulnerable nuestro proyecto, además de aplicaciones cloud eliminan los archivos que no sean confirmados dentro de un commit, por lo que perderíamos la información de los mismos. Es recomendable realizar la carga en servidores especiales, ya sean propios o de terceros.

Vamos a crear un directorio en la raíz del proyecto con el nombre de `static/uploads`, y luego le definimos al interceptor del método el lugar en donde se deben almacenar los archivos:

```ts
import { diskStorage } from 'multer'
...
@Controller( 'files' )
export class FilesController {
    ...
    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', {
        ...,
        storage: diskStorage( {
            destination: './static/uploads'
        } )
    } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) { ... }
}
```

Cuando hacemos uso nuevamente del endpoint y enviamos un archivo, tendremos un nuevo elemento dentro del directorio que creamos hace poco, pero es un archivo con un nombre codificado y sin extensión.

Si queremos subir al repositorio el directorio de archivos, pero sin ningún archivo inicialmente, creamos un nuevo archivo llamado `.gitkeep` dentro de la misma carpeta, con el fin de que git le haga seguimiento al mismo.

## Renombrar el archivo subido

Al momento de subir un archivo queremos que contenga un nombre único, pero que conserve su extensión, por tal motivo vamos a usar un nuevo helper en que definimos el nuevo nombre mediante un identificador único generado por el paquete de uuid, el cual instalamos con el siguiente comando:

```txt
$: pnpm i -S uuid
$: pnpm i -D @types/uuid
```

```ts
import { v4 as uuid } from 'uuid'


export const fileNamer = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {
    if ( !file ) return callback( new Error( 'File is empty' ), false )

    const fileExtension = file.mimetype
        .split( '/' )
        .at( 1 )

    const fileName = `${ uuid() }.${ fileExtension }`

    return callback( null, fileName )
}
```

Ahora dentro del controlador llamamos el método para renombrar el archivo en la propiedad storage del interceptor `FileInterceptor`:

```ts
@Controller( 'files' )
export class FilesController {
    ...
    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', {
        fileFilter: fileFilter,
        storage: diskStorage( {
            ...,
            filename: fileNamer
        } )
    } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) { ... }
}
```

No importa cuantas veces subamos la misma imagen, el nombre con el que se guardará será siempre diferente

## Servir archivos de manera controlada

Vamos a servir al usuario el archivo que nos acaba de subir, y para ello primero creamos un método en el servicio, que nos ayude a servir la ubicación completa del archivo:

```ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { existsSync } from 'fs'
import { join } from 'path'

@Injectable()
export class FilesService {
    getStaticProductImage ( imageName: string ) {
        const path = join( __dirname, '../../static/products', imageName )

        if ( !existsSync( path ) )
            throw new BadRequestException( `No product found with image ${ imageName }` )

        return path
    }
}
```

Lo siguiente será crear un método con el verbo GET dentro del controlador, para enviar el archivo dentro de la respuesta, pero es necesario usar el decorador `@Res` tipando la propiedad con la interface `Response` de `express`, para poder enviar el archivo. Esto nos trae una desventaja que en el momento no aplica, y es que le quitamos el control de la respuesta a Nest, por lo que cualquier interceptor se ve omitido por el uso del nuevo decorador.

```ts
import { ..., Res } from '@nestjs/common'
import { Response } from 'express'
...
@Controller( 'files' )
export class FilesController {
    ...
    @Get( 'product/:imageName' )
    findProductImage ( @Param( 'imageName' ) imageName: string, @Res() res: Response ) {
        const path = this.filesService.getStaticProductImage( imageName )
        return res.sendFile( path )
    }
}
```

Ahora, al momento que enviamos una petición get al endpoint `http://localhost:3000/api/files/product/:imageName`, vamos a recibir la imagen que se cargo, y el nombre de la imagen es obtenida por el usuario a través de la respuesta que obtiene al momento de cargarla (en la siguiente lección seremos más específicos):

```ts
@Controller( 'files' )
export class FilesController {
    ...
    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', { ... } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) {
        ...
        const secureUrl = `http://localhost:3000/api/files/product/${ file.filename }`
        return { secureUrl }
    }
    ...
}
```

## Retornar el secureUrl

La manera en que estamos retornando el endpoint para consultar la imagen, es muy volátil, y esto se debe a que en producción no sabremos con certeza el hostname y el port en el que se despliegue la aplicación. La manera en que hacemos que la aplicación sea segura, es mediante las variables de entorno, por lo que definimos una variables para el host y otra para el puerto:

```.env
PORT = 3000
HOST_API = "http://localhost:3000/api"
```

Luego inyectamos el servicio de configuración dentro del controlador para reconocer las variables de entorno:

```ts
import { ConfigService } from '@nestjs/config'
...
@Controller( 'files' )
export class FilesController {
    constructor ( ..., private readonly _configService: ConfigService ) { }
    ...
}
```

Es importante hacer la importación del módulo de configuración dentro del módulo de imágenes:

```ts
import { ConfigModule } from '@nestjs/config'
...
@Module( {
    imports: [ ConfigModule ],
    ...
} )
export class FilesModule { }
```

Ahora com plena seguridad usamos la variable de entorno con el host:

```ts
@Controller( 'files' )
export class FilesController {
    constructor ( ..., private readonly _configService: ConfigService ) { }

    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', { ... } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) {
        ..
        const secureUrl = `${ this._configService.get( 'HOST_API' ) }/files/product/${ file.filename }`
        return { secureUrl }
    }
}
```

Aprovechando la variable del puerto, podemos mejorar el archivo `main.ts` usando un logger:

```ts
import { Logger, ... } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

async function bootstrap () {
    ...
    const logger = new Logger( 'Bootstrap' )
    const configService = new ConfigService()
    ...
    await app.listen( configService.get( 'PORT' ) )

    logger.log( `>> Application run in ${ await app.getUrl() }` )
}
bootstrap()
```

## Otras formas de desplegar archivos

Vamos a crear una nueva carpeta en la raíz del proyecto, con el nombre de `public` y dentro almacenamos imágenes cuyos nombres hacen match con los nombres que tenemos en nuestro seed. Normalmente es preferible que el nombre del directorio de las imágenes o la carpeta contenedora de diversos directorios de archivos, tenga el nombre de `public/assets/` con el objetivo de que no tenga problemas con otros endpoints, ya sea de nuestro backend o nuestro frontend SPA.

Para servir contenido estático en nuestro proyecto, debemos instalar el siguiente paquete:

```txt
$: pnpm i @nestjs/serve-static
```

Luego, en el archivo `app.module.ts` llamamos el módulo para servir contenido estático:

```ts
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
...
@Module( {
    imports: [
        ...
        ServeStaticModule.forRoot( {
            rootPath: join( __dirname, '..', 'public' )
        } ),
        ...
    ],
} )
export class AppModule { }
```

Ahora, si vamos a un navegador y hacemos uso del endpoint `http://localhost:3000/assets/products/:fileName` (incluyendo la extensión), obtenemos la imagen que tenga el nombre enviado.

Si no vamos a modificar las imágenes, podemos usar esta estrategia como una forma de hacer despliegue de contenido estático a cualquier publico.

Nuestro seed tiene valores dentro de la tabla `product_images`, y debemos actualizar dichos valores para que se puedan usar las imágenes que tenemos dentro de nuestra carpeta `public/assets/products`. Una manera sería usar una sentencia SQL para realizar la actualización de toda la columna:

```sql
UPDATE product_images SET url = 'http://localhost:3000/api/products/' || url
```

Aunque es valido, no sería lo mejor, ya que estamos ingresando información repetida que usa espacio dentro de la base de datos. Vamos a ver una mejor solución en la siguiente lección.

## Colocar imágenes en el directorio estático

Vamos a mover las imágenes del directorio `public/assets/products/` a `static/products/`, ya que no las queremos servir de manera estática, sino que usaremos el endpoint de consulta que creamos en la lección [](README.md#servir-archivos-de-manera-controlada).

Ahora, para proveer las imágenes al momento de listar los productos, podemos realizar la siguiente modificación:

```ts
@Injectable()
export class ProductsService {
    ...
    private readonly _urlSegmentImages = `${ this._configService.get( 'HOST_API' ) }/files/product`

    constructor (
        ...,
        private readonly _configService: ConfigService
    ) { }
    ...
    async findAll ( { limit = 10, offset = 0 }: PaginationDto ) {
        ...
        return {
            ...,
            data: data.map( ( { images, ...product } ) => ( {
                ...product,
                images: images.map( img => `${ this._urlSegmentImages }/${ img.url }` )
            } ) )
        }
    }
    ...
    async findOnePlain ( term: string ) {
        ...
        return {
            ...rest,
            images: images.map( img => `${ this._urlSegmentImages }/${ img.url }` )
        }
    }
    ...
}
```

En este punto, ya podemos deshacer la configuración para servir contenido estático, puesto que controlando el acceso a las imágenes mediante un endpoint, podemos administrar permisos o cualquier configuración pertinente a la configuración.
