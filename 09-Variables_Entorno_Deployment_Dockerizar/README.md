# Sección 09: Variables de entorno - Deployment y Dockerizar la aplicación

En esta sección trabajaremos en la configuración de variables de entorno y su validación:

Puntualmente veremos:

- Dockerizacion
- Mongo Atlas
- Env file
- joi
- Validation Schemas
- Configuration Module
- Recomendaciones para un Readme útil
- Despliegues
- Dockerfile

## Continuación del proyecto

Vamos a seguir usando el proyecto de la sección anterior, por lo que podemos usar el siguiente comando para copiarlo:

```txt
$: cp -r 08_Seed_Paginacion/pokedex 09_Variables_Entorno_Deployment_Dockerizar/
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

Para poblar la base de datos tenemos que realizar una petición GET al endpoint `http://localhost:3000/api/seed` y podemos usar curl para esa tarea con el siguiente comando (está es una de las muchas opciones):

```txt
$: curl http://localhost:3000/api/seed
```

## Configuración de variables de entorno

Las variables de entorno nos permiten definir los valores respectivos a cada entorno, nos ayuda a no cambiar de manera manual código que puede cambiar según la etapa y el ambiente en el que corre. Vamos a crear el archivo `.env` para dicho fin, de paso lo añadimos a la lista de `.gitignore`.

Dentro de las variables de entorno vamos a añadir lo siguiente:

```.env
MONGO_DB = "mongodb://localhost:27017/nest-pokemon"
PORT = 3000
```

Para reconocer las variables de entorno dentro del proyecto, añadimos un nuevo paquete con el siguiente comando:

```txt
$: pnpm i @nestjs/config
```

Luego debemos ir a `app.module.ts` y añadir la siguiente configuración:

```ts
import { ConfigModule } from '@nestjs/config'
...

@Module( {
    imports: [
        ConfigModule.forRoot(),
        ...
    ]
} )
export class AppModule { }
```

Si queremos comprobar que nuestro proyecto ya lee las variables de entorno tanto del equipo como local de la app, podemos imprimirlas en consola. Tener en cuenta que todas las variables serán de tipo string sin importar que las hayamos definido como number u otro tipo en el archivo `.env`

```ts
@Module( { ... } )
export class AppModule { 
    constructor() {
        console.log( process.env )
    }
}
```

Con las variables siendo reconocidas, podemos aplicar los cambios necesarios en nuestra aplicación para la conexión de mongo y el puerto de ejecución del proyecto:

```ts
@Module( {
    imports: [
        ...,
        MongooseModule.forRoot( process.env.MONGO_DB ),
        ...
    ]
} )
export class AppModule { }
```

## Configuration Loader

Es importante que el `ConfigurationModule` siempre este en el inicio de toda la configuración. Podemos hacer uso de las variables de entorno de manera directa dentro del código, pero el problema será al momento de no tener un valor asignado a la variables, o no tener en si la propia variable.

Por ejemplo, queremos establecer mediante variable de entorno un limite de registros para las consultas GET en donde no se especifique el puerto. Dada la casualidad no se ha definido la variable dentro del archivo `.env`, pero aún así la usamos dentro del método del servicio:

```ts
@Injectable()
export class PokemonService {
    ...
    findAll ( { limit = +process.env.DEFAULT_LIMIT, offset = 0 }: PaginationDto ) {
        return this._pokemonModel
            .find()
            .limit( limit )
            .skip( offset )
            .sort( {
                number: 1
            } )
            .select( '-__v' )
    }
    ...
}
```

Como la variable `process.env.DEFAULT_LIMIT` no ha sido definida, su valor será `undefined` y al momento de parsearla a numérico tendremos un `NaN`, el cual es reconocido como valido por Mongo y por lo tanto nos retornará todos los documentos almacenados en la colección.

Una solución elegante es mapear las variables de entorno y establecer valores por defecto en caso de ser necesario y lógico en cada variable. Esto lo vamos a aplicar dentro del archivo `config/app.config.ts`, en donde exportamos una función que exporta un objeto con las variables mapeadas:

```ts
export const EnvConfiguration = () => ( {
    environment: process.env.NODE_ENV || 'dev',
    mongodb: process.env.MONGO_DB,
    port: +process.env.PORT || 3001,
    defaultLimit: +process.env.DEFAULT_LIMIT || 5
} )
```

Como vemos la mayoría de las variables poseen valores por defecto, excepto la conexión con la base de datos, y esto es por qué queremos lanzar un error ya que la base de datos debería ser lanzada primero.

Ahora, vamos a reconocer esta función dentro del `app.module.ts`:

```ts
import { EnvConfiguration } from './config/app.config'
...

@Module( {
    imports: [
        ConfigModule.forRoot( {
            load: [ EnvConfiguration ]
        } ),
        ...
    ]
} )
export class AppModule { }
```

Dentro del proyecto ya no vamos a usar más `process.env` para reconocer las variables, lo vamos a reemplazar por un servicio que nos ofrece `ConfigModule`.

## ConfigurationService

`ConfigurationService` es un servicio que nos permite usar las variables mapeadas con anterioridad. Se debe hacer la inyección del mismo dentro de las clases en los que se debe usar, pero antes se debe importar dentro del módulo a usar:

```ts
@Module( {
    ...,
    imports: [
        ConfigModule,
        ...
    ]
    ...
} )
export class PokemonModule { }
```

Procedemos con la inyección del servicio:

```ts
import { ConfigService } from '@nestjs/config'
...

@Injectable()
export class PokemonService {
    constructor (
        ...,
        private readonly _configService: ConfigService
    ) { }
    ...
}
```

En estos momentos podemos hacer uso del servicio para obtener las variables definidas en el mapeo:

```ts
@Injectable()
export class PokemonService {
    constructor ( ... ) {
        const defaultLimit = this._configService.get<number>( 'defaultLimit' )
        console.log( { defaultLimit, type: typeof defaultLimit } )              // { defaultLimit: 10, type: 'number' }
    }
    ...
}
```

Para efecto práctico dentro de nuestro proyecto, vamos a usar el valor de la variable en el método correspondiente. En caso de necesitemos dicho valor en varios lugares, podemos crear una propiedad dentro de la clase y asignar su valor dentro del constructor.

```ts
@Injectable()
export class PokemonService {
    private _defaultLimit: number

    constructor ( ... ) {
        this._defaultLimit = this._configService.get<number>( 'defaultLimit' )
    }
    ...
    findAll ( { limit = this._defaultLimit, offset = 0 }: PaginationDto ) { ... }
    ...
}
```

Debemos tener en cuenta que toda la configuración anterior solo la podemos aplicar dentro de los Building Blocks de Nest, en los demás archivos si podemos hacer uso de `process.env` para obtener las variables de entorno. Tal es el caso del archivo `main.ts` en donde se define el puerto de la aplicación:

```ts
async function bootstrap () {
    ...
    await app.listen( Number( process.env.PORT ) || 3001 )
    ...
}
```

## Joi - ValidationSchema

Si queremos ser más estrictos con el valor de las variables de entorno y manejar los errores del mismo, podemos usar la librería `joi` con el siguiente comando:

```txt
$: pnpm install joi
```

Con el paquete instalado, creamos el archivo `config/joi.validation.ts` en donde establecemos las reglas de validación para las variables:

```ts
import * as Joi from 'joi'

export const JoiValidationSchema = Joi.object( {
    MONGO_DB: Joi.required(),
    PORT: Joi.number().default( 3002 ),
    DEFAULT_LIMIT: Joi.number().default( 6 )
} )
```

Este esquema lo usamos en `app.module.ts`:

```ts
import { JoiValidationSchema } from './config/joi.validation'
...

@Module( {
    imports: [
        ConfigModule.forRoot( {
            load: [ EnvConfiguration ],
            validationSchema: JoiValidationSchema
        } ),
        ...
    ]
} )
export class AppModule { }
```

Es importante reconocer la prioridad de ejecución entre los archivos `app.config.ts` y `joi.validation.ts`, puesto que el segundo archivo se ejecuta primero y por lo tanto define el valor de las variables de entorno que no están definidas, pero se deben mantener las validaciones con mucho cuidado en ambos archivos en caso de querer usarlos a la vez, especialmente en el tipo de dato.

## ENV Template

Siempre es aconsejable que se tenga un archivo que sirva de ejemplo o template de las variables de entorno, puesto que el archivo `.env` no se debe cargar a un espacio público. Podemos copiar el valor de las variables que no afectan de manera directa la información de la aplicación, como por ejemplo el puerto de la aplicación o el limite de resultados, pero, debemos omitir el valor de las variables que requieren un gran secreto, como por ejemplo la firma de los JWT.

También es normal definir los pasos necesarios para la configuración de la aplicación dentro de un archivo `README.md`, con el fin de que cualquier desarrollador pueda levantar de manera correcta el proyecto.

## MongoAtlas - MongoDB en la nube

Vamos a crear una base de datos en Mongo Atlas, para lo cual ingresamos a dicha aplicación, creamos una cuenta y añadimos un nuevo cluster de tipo `Shared` el cual es gratuito. La mayoría de las configuraciones las dejamos por defecto, excepto, el nombre del cluster.

Lo siguiente es crear un nuevo usuario de base de datos, podemos usar el admin, pero es preferible tener un usuario dedicado para nuestro cluster. Tanto el usuario como la contraseña que definamos, debemos tenerlas almacenadas dentro del archivo de variables de entorno. Luego, asignamos los permisos sobre las bases de datos que puede tener el nuevo usuario.

Terminada la creación del cluster, obtenemos el link de conexión al presionar la opción de conectar. Dicha cadena de conexión también la guardamos dentro de las variables de entorno, reemplazando la base de datos que teníamos para hacer las pruebas. Debemos reemplazar las secciones de `<username>` y `<password>`

## Desplegar aplicación en la nube

Con la base de datos en la nube, podemos dar paso al cargue del proyecto en la nube. Lo primero será ejecutar el comando que nos ayuda a crear el directorio de distribución:

```txt
$: pnpm build
```

De manera automática Heroku reconoce el comando `build` y por lo tanto se encarga de ejecutarlo. Al momento de realizar esta lección, Heroku ya no cuenta con un plan gratuito, por lo que realizaremos el despliegue con [Render](https://render.com/), procurando usar el plan gratuito, ya que no será un despliegue comercial.

Lo primero es tener el proyecto en un repositorio aislado. Posteriormente se crea una cuenta en Render y se selecciona el plan Individual, el cual es gratuito. Lo siguiente es crear un nuevo Web Service en donde se selecciona el repositorio, a continuación se definen algunas propiedades para el despliegue:

| Key | Value |
| --- | ----- |
| Name | `pokedex` |
| Environment | `Node` |
| Build Command | `npm i @nestjs/cli; npm i; npm run build` o `yarn add @nestjs/cli; yarn; yarn build` |
| Start Command | `npm run start:prod` o `yarn start:prod` |
| Instance Type | `Free` |
| Advance > Add Secret File | Nombre del archivo: `.env`. Contenido: Contenido del archivo secreto `.env`. Este paso se puede reemplazar por el ingreso uno a uno de las variables en Advance > Add Environment Variable |

Con lo anterior, procedemos a crear el Web Service y debemos estar atentos a los logs, cualquier error durante la etapa de despliegue debe ser corregido para que de manera automática se haga un nuevo deploy.

Cuando la aplicación sea desplegada de manera exitosa, podemos ingresar a la url que nos ofrece el despliegue, en mi caso tengo acceso al siguiente dominio: <https://pokedex-2mq8.onrender.com/>

## Dockerizar - Dockerfile

Vamos a dockerizar nuestra aplicación, para lo cual creamos el archivo `Dockerfile` en la raíz de nuestro proyecto. En dicho archivo vamos a añadir las siguientes instrucciones:

```Dockerfile
FROM node:18-alpine3.15

# Set working directory
RUN mkdir -p /var/www/pokedex
WORKDIR /var/www/pokedex

# Copaiar el directorio y su contenido
COPY . ./var/www/pokedex
COPY package.json tsconfig.json tsconfig.build.json /var/www/pokedex/
RUN yarn install --prod
RUN yarn build

# Dar permiso para ejecutar la aplicación
RUN adduser --disabled-password pokeuser
RUN chown -R pokeuser:pokeuser /var/www/pokedex
USER pokeuser

# Limpiar el cache
RUN yarn cache clean --force

EXPOSE 3000

CMD [ "yarn", "start" ]
```

También creamos el archivo `.dockerignore` y añadimos los directorios y archivos que no queremos cargar dentro la imagen de docker:

```.dockerignore
dist/
node_modules/
mongo/
.git/
.gitignore
pnpm-lock.yaml
```

## Definir la construcción de la imagen

En la lección anterior definimos algunos pasos para la creación de la imagen, pero lo vamos a mejorar para que sea multi-stage y de esta manera tener una imagen más liviana y precisa.

```Dockerfile
# Install dependencies only when needed
FROM node:18-alpine3.15 AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
RUN yarn install --frozen-lockfile


# Build the app with cache dependencies
FROM node:18-alpine3.15 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build


# Production image, copy all the files and run nest
FROM node:18-alpine3.15 AS runner
# Set working directory
WORKDIR /usr/src/app
COPY package.json ./
RUN yarn install --prod
COPY --from=builder /app/dist ./dist

CMD [ "node","dist/main" ]
```

Con lo anterior tenemos 3 fases: la primera se encarga unicamente de la instalación de dependencias, la segunda se encarga de copiar esas dependencias y construir el directorio `dist`, y la tercera se encarga de instalar las dependencias necesarias para producción y de copiar y ejecutar la carpeta de distribución.

Ahora, vamos a crear un archivo llamado `docker-compose.prod.yaml` y definimos el servicio de la base de datos que ya teniamos, pero adicional creamos un servicio para nuestra aplicación:

```yaml
version: '3'

services:
    pokedexapp:
        depends_on:
            - db
        build:
            context: .
            dockerfile: Dockerfile
        image: pokedex-docker
        container_name: pokedexapp
        restart: always # reiniciar el contenedor si se detiene
        ports:
            - "${PORT}:${PORT}"
        environment:
            MONGO_DB: ${MONGO_DB}
            PORT: ${PORT}
            DEFAULT_LIMIT: ${DEFAULT_LIMIT}

    db:
        image: mongo:5
        container_name: mongo-poke
        restart: always
        ports:
            - 27017:27017
        environment:
            MONGODB_DATABASE: nest-pokemon
```

## Construir la imagen

Creamos un nuevo archivo llamado `.env.prod`, dentro del cual copiamos las mismas variables que tenemos dentro del archivo `.env`, pero tomando el valor de lo que publiquemos en producción, por ejemplo el almacenamiento en la base de datos, la cual queremos conectar al servicio que se encuentra en la misma network del servicio app:

```env
MONGO_DB = "mongodb://mongo-poke:27017/nest-pokemon"
PORT = 3000
DEFAULT_LIMIT = 10
```

Para realizar la construcción y ejecución de la imagen y servicios debemos usar el siguiente comando:

```txt
$: docker-compose -f docker-compose.prod.yaml --env-file .env.prod up --build
```

Si solo queremos realizar la ejecución en modo Detach usamos el siguiente comando:

```txt
$: docker-compose -f docker-compose.prod.yaml --env-file .env.prod up -d
```

Ya podemos volver a probar la aplicación en el endpoint `http://localhost:3000/`

## Conservar la base de datos y analizar imagen

Cada que eliminamos el servicio de la base de datos, ya sea por qué usamos una nueva versión de la imagen o cualquier otra situación, pero queremos mantener los datos al momento de volver a subir el servicio, debemos habilitar el volumen dentro del archivo `docker-compose.prod.yaml`:

```yaml
version: '3'

services:
    ...
    db:
        ...
        volumes:
            - ./mongo:/data/db
```

Podemos analizar el contenido de un contenedor usando el siguiente comando:

```txt
$: docker exec -it <id del container> /bin/sh
```

Normalmente se usa la exploración del contenedor para asegurarnos que los archivos se han copiado correctamente.
