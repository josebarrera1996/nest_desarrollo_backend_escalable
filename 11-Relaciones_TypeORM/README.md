# Sección 11: Relaciones en TypeORM

Esta sección está cargada de contenido nuevo para trabajar con bases de datos relacionales.

Temas que veremos:

- Relaciones
  - De uno a muchos
  - Muchos a uno
- Query Runner
- Query Builder
- Transacciones
- Commits y Rollbacks
- Renombrar tablas
- Creación de un SEED
- Aplanar resultados

La idea es hacer que nuestro endpoint de creación y actualización de producto permita la actualización de una tabla secundaria de la misma forma como lo hemos creado en la sección pasada.

## Continuación del proyecto

Vamos a seguir usando el proyecto de la sección anterior, por lo que podemos usar el siguiente comando para copiarlo:

```txt
$: cp -r 10_TypeORM_Postgres/teslo-shop 11_Relaciones_TypeORM/
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

## ProductImage Entity

No vamos a crear un nuevo módulo, por que no queremos tener un CRUD independiente para las imágenes, por lo tanto vamos a crear la nueva entidad dentro del módulo de productos.

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class ProductImage {
    @PrimaryGeneratedColumn( )
    id: number

    @Column( 'text' )
    url: string
}
```

Para que TypeORM reconozca la entidad, debemos ir a `products.module.ts` y añadir la clase en la configuración `forFeature` de TypeOrmModule:

```ts
import { Product, ProductImage } from './entities'
...

@Module( {
    ...,
    imports: [
        TypeOrmModule.forFeature( [
            Product,
            ProductImage
        ] )
    ]
} )
export class ProductsModule { }
```

## OneToMay y ManyToOne

Para realizar estas relaciones debemos saber la cardinalidad de la relación, en este caso `1` producto puede tener `n` imágenes (`1:n`), y muchas imágenes puede tener 1 dueño (`n:1`).

Dentro de las entidades debemos crear propiedades que nos ayuden a relacionarse entre si. Primero haremos la relación `1:n` de los productos hacia las imágenes, y definimos que sea de tipo cascade para todas las acciones (podemos usar cualquiera de estas opciones `("insert" | "update" | "remove" | "soft-remove" | "recover")`):

```ts
import { ..., OneToMany } from "typeorm"
import { ProductImage } from './product-image.entity'

@Entity()
export class Product {
    ...
    @OneToMany(
        () => ProductImage,
        productImage => productImage.product,
        { cascade: true }
    )
    images?: ProductImage[]
    ...
}
```

Ahora creamos la propiedad `product` para la relación `n:1` dentro de la entidad `ProductImage`:

```ts
import { ..., ManyToOne } from 'typeorm'
import { Product } from './product.entity'

@Entity()
export class ProductImage {
    ...
    @ManyToOne(
        () => Product,
        product => product.images
    )
    product: Product
}
```

Siempre debemos hacernos la pregunta *¿Merece la pena, crear una nueva tabla para relacionarla con una existente?*, y nos respondemos a esa pregunta con esta deducción: Si creamos una nueva columna que puede tener datos nulos, es mejor crear una nueva relación, de lo contrario mantengamos una columna con el arreglo de datos.

## Crear imágenes de producto

Cuando se quiere enviar imágenes a nuestro endpoint de creación o de actualización, obtendremos un error por qué no están definidas dentro de los DTO, y por ello debemos añadir la siguiente configuración dentro del DTO de creación:

```ts
export class CreateProductDto {
    ...
    @IsOptional()
    @IsString( { each: true } )
    @IsArray()
    images?: string[]
}
```

Para recibir las imágenes debemos realizar una modificación dentro del servicio del producto y aplicar una corrección en los métodos de creación y actualización:

```ts
@Injectable()
export class ProductsService {
    ...
    async create ( createProductDto: CreateProductDto ) {
        try {
            const { images = [], ...productDetails } = createProductDto

            const product = this._productRepository.create( { ...productDetails } )
            ...
        } catch ( error ) { ... }
    }
    ...
    async update ( id: string, updateProductDto: UpdateProductDto ) {
        const product = await this._productRepository.preload( {
            id, ...updateProductDto, images: []
        } )
        ...
    }
    ...
}
```

Con lo anterior recibimos la imágenes, pero no las guardamos en la base de datos, ya que no son instancias de la entidad `ProductImage`. Buscando este fin, debemos inyectar un repositorio de la clase mencionada anteriormente:

```ts
import { Repository } from 'typeorm'
...
@Injectable()
export class ProductsService {
    ...
    constructor (
        ...,
        @InjectRepository( ProductImage ) private readonly _productImageRepository: Repository<ProductImage>,
    ) { }
    ...
}
```

Ahora si podemos enviar las instancias de imágenes a la base de datos al momento de crear:

```ts
@Injectable()
export class ProductsService {
    ...
    constructor (
        @InjectRepository( Product ) private readonly _productRepository: Repository<Product>,
        @InjectRepository( ProductImage ) private readonly _productImageRepository: Repository<ProductImage>,
    ) { }

    async create ( createProductDto: CreateProductDto ) {
        try {
            const { images = [], ...productDetails } = createProductDto

            const product = this._productRepository.create( {
                ...productDetails,
                images: images.map( url => this._productImageRepository.create( { url } ) )
            } )

            ...
        } catch ( error ) { ... }
    }
    ...
}
```

Para evitar que el usuario vea las instancias de las imágenes creadas, retornamos un nuevo objeto con las mismas imágenes que nos envía en el body:

```ts
@Injectable()
export class ProductsService {
    ...
    async create ( createProductDto: CreateProductDto ) {
        try {
            const { images = [], ...productDetails } = createProductDto
            ...
            return { ...product, images}
        } catch ( error ) { ... }
    }
    ...
}
```

## Aplanar las imágenes

Si consultamos todos los productos, no podremos ver la propiedad de imágenes, y esto se debe a que es una relación, y para poder imprimirla debemos hacer lo siguiente en el servicio:

```ts
@Injectable()
export class ProductsService {
    ...
    async findAll ( ... ) {
        const { 0: data, 1: totalResults } = await this._productRepository.findAndCount( {
            ...,
            relations: {
                images: true
            }
        } )
        ...
    }
    ...
}
```

Con lo anterior traemos toda la información relaciona a la imagen, puesto que estamos aplicando una consulta LEFT JOIN a la base de datos. Si solo queremos un arreglo con las urls de la imágenes, entonces aplicamos la siguiente estrategia:

```ts
@Injectable()
export class ProductsService {
    ...
    async findAll ( ... ) {
        ...
        return {
            ...,
            data: data.map( ( { images, ...product } ) => ( { ...product, images: images.map( img => img.url ) } ) )
        }
    }
    ...
}
```

Cuando hacemos la consulta de un único producto, volvemos a encontrarnos con el problema de que no contamos con la propiedad en la respuesta, y que en esta ocasión no tenemos la opción de `relations` para hacer la consulta con el método `findOneBy`. Una opción es usar el método `findOne` que si tiene la propiedad `relations`, o usar la función `createQueryBuilder`. Pero en realidad hay una manera más sencilla y usar `Eager relations` el cual funciona con cualquier método `find*`, esta estrategia la configuramos en el la entidad producto, en la propiedad asociada con con la tabla de imágenes:

```ts
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { ProductImage } from './product-image.entity'

@Entity()
export class Product {
    ...
    @OneToMany(
        () => ProductImage,
        productImage => productImage.product,
        {
            cascade: true,
            eager: true
        }
    )
    images?: ProductImage[]
    ...
}
```

Tenemos el inconveniente de que las relaciones eager no se pueden usar en los Query Builder, en donde tendremos que usar `leftJoinAndSelect` para cargar la relación y definir un alías para la consulta:

```ts
@Injectable()
export class ProductsService {
    ...
    async findOne ( term: string ) {
        ...
        if ( !product )
            product = await this._productRepository.createQueryBuilder( 'product' )
                .where( ... )
                .leftJoinAndSelect( 'product.images', 'productImages' )
                .getOne()
        ...
    }
    ...
}
```

Para aplanar el resultado y no afectar el método `remove`, creamos una función con tal objetivo que será usada dentro del controlador, pero que a su vez sigue usando el método original de `findOne`:

```ts
@Injectable()
export class ProductsService {
    ...
    async findOnePlain ( term: string ) {
        const { images = [], ...rest } = await this.findOne( term )
        return {
            ...rest,
            images: images.map( image => image.url )
        }
    }
    ...
}
```

```ts
@Controller( 'products' )
export class ProductsController {
    ...
    @Get( ':term' )
    findOne ( @Param( 'term' ) term: string ) {
        return this.productsService.findOnePlain( term )
    }
    ...
}
```

## Query Runner

Cuando queremos actualizar un producto, debemos actualizar la tabla de imágenes en caso de ser necesario. El primer caso es cuando nos envían un arreglo vacío para la propiedad `images`, en cuyo caso debemos eliminar todas las imágenes asociadas al producto, y el segundo caso es cuando recibimos un nuevo arreglo con imágenes que eliminan y reemplazan las que ya se encontraban en la tabla. Debemos aclarar que no debemos hacer nada en caso de que no nos envíen la propiedad `images` dentro de la consulta.

Lo primero que vamos a hacer es inyectar una instancia de `DataSource` con el fin de tener una referencia de nuestra base de datos, y que será usada por un queryRunner dentro el método de actualización. En la función de actualización desestructuramos la información que recibimos, y precargamos toda la información enviada, excepto las imágenes:

```ts
import { DataSource, ... } from 'typeorm'

@Injectable()
export class ProductsService {
    ...
    constructor (
        ...,
        private readonly _dataSource: DataSource
    ) { }
    ...
    async update ( id: string, updateProductDto: UpdateProductDto ) {
        const { images, ...toUpdate } = updateProductDto

        const product = await this._productRepository.preload( {
            id, ...toUpdate
        } )

        if ( !product )
            throw new NotFoundException( `Product with id '${ id }' not found` )

        const queryRunner = this._dataSource.createQueryRunner()

        try {
            return await this._productRepository.save( product )
        } catch ( error ) {
            this._handleDBException( error )
        }
    }
    ...
}
```

La idea que tenemos a continuación, es de ejecutar 2 transacciones antes de actualizar el producto. La primera transacción es eliminar las imágenes relacionadas al producto en caso de tener una arreglo vacío o un nuevo arreglo, y la segunda transacción es la inserción de las nuevas imágenes. Si alguna falla tendremos la oportunidad de realizar un RollBack a la base de datos.

## Transacciones

Una transacción es una serie de queries que pueden impactar la base de datos, pero que solo se ejecutan luego de un COMMIT, con el cual nos aseguramos que queremos realizar dicha actividad, y que además libera la conexión del queryRunner a la base de datos.

En el método de actualización, vamos a seguir estos pasos:

1. Desestructurar la información que llega desde el body
2. Crear una constante con el resultado de precargar toda la información en el repositorio, excepto las imágenes.
3. Si el producto no existe retornamos un error 404
4. Creamos un queryRunner, el cual hará uso de la inyección del DataSource de la base de datos.
5. Conectamos el queryRunner
6. Iniciamos una transacción
7. Si la propiedad desestructurada `images` si llego dentro de la petición, realizamos la consulta de eliminación de todas las imágenes asociadas al producto con el id que se recibe en los params de la petición.
8. Creamos una instancia de `ProductImage` por cada imagen recibida
9. Guardamos el producto
10. Realizamos commit de la transacción, si el cual no se podrían llevar a cabo los pasos del 6 al 9.
11. Liberamos la transacción para no seguir usándola.
12. Retornamos el producto.
13. En caso de error, realizamos un rollBack de la transacción para recuperar los valores antes de la misma.
14. Liberamos la transacción para no seguir usándola.
15. Manejamos el error.

```ts
@Injectable()
export class ProductsService {
    ...
    async update ( id: string, updateProductDto: UpdateProductDto ) {
        const { images, ...toUpdate } = updateProductDto

        const product = await this._productRepository.preload( {
            id, ...toUpdate
        } )

        if ( !product )
            throw new NotFoundException( `Product with id '${ id }' not found` )

        const queryRunner = this._dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            if ( images ) {
                await queryRunner.manager.delete( ProductImage, {
                    product: { id }
                } )

                product.images = images.map( url => this._productImageRepository.create( { url } ) )
            }

            await queryRunner.manager.save( product )
            await queryRunner.commitTransaction()
            await queryRunner.release()

            return product

        } catch ( error ) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()

            this._handleDBException( error )
        }
    }
    ...
}
```

Para cargar las imágenes dentro del producto retornado por el método de actualización, podemos usar el método `findOnePlain` buscando por el id, luego de cerrar la transacción:

```ts
@Injectable()
export class ProductsService {
    ...
    async update ( id: string, updateProductDto: UpdateProductDto ) {
        ...
        try {
            ...
            return this.findOnePlain( id )
        } catch ( error ) { ... }
    }
    ...
}
```

## Eliminación en cascada

Si queremos eliminar un producto que contiene imágenes, tendremos un error por la llave foránea dentro de la tabla de imágenes. Por este motivo debemos afectar a la vez la tabla de imágenes y la tabla de productos.

La solución es ir a la entidad `ProductImage` y definir que al momento de eliminar un producto, afectemos cascada las imágenes relacionadas:

```ts
@Entity()
export class ProductImage {
    ...
    @ManyToOne(
        () => Product,
        product => product.images,
        { onDelete: 'CASCADE' }
    )
    product: Product
}
```

Cuando vayamos a crear la semilla que poblará nuestra base de datos, eliminaremos todos los productos existentes y por lo tanto sus imágenes. Con la configuración anterior no tendremos que preocuparnos por errores de llaves foráneas o restricciones en cascada, pero con el siguiente método debemos ser muy cautelosos:

```ts
@Injectable()
export class ProductsService {
    ...
    async deleteAllProducts () {
        const query = this._productRepository.createQueryBuilder( 'product' )

        try {
            return await query
                .delete()
                .where( {} )
                .execute()
        } catch ( error ) {
            this._handleDBException( error )
        }
    }
}
```

## Product Seed

Vamos a crear un nuevo resource para el seed con el siguiente comando:

```txt
$: nest g res seed --no-spec
? What transport layer do you use? REST API
? Would you like to generate CRUD entry points? No
```

Dentro del controlador creamos un nuevo método que reciba la petición GET:

```ts
import { Controller, Get } from '@nestjs/common'
import { SeedService } from './seed.service'

@Controller( 'seed' )
export class SeedController {
    constructor ( private readonly seedService: SeedService ) { }

    @Get()
    executeSeed () {
        return this.seedService.runSeed()
    }
}
```

Ahora, debemos exportar el servicio de productos e inyectarlo dentro del servicio de seed:

```ts
@Module( {
    ...,
    exports: [ ProductsService ]
} )
export class ProductsModule { }
```

```ts
@Module( {
    imports: [ ProductsModule ],
    ...
} )
export class SeedModule { }
```

```ts
import { ProductsService } from 'src/products/products.service'

@Injectable()
export class SeedService {
    constructor ( private readonly _productsService: ProductsService ) { }
    ...
}
```

Con el servicio de productos inyectado, procedemos a eliminar todos los registros existentes en la base de datos:

```ts
@Injectable()
export class SeedService {
    constructor ( private readonly _productsService: ProductsService ) { }

    async runSeed () {
        await this._insertNewProducts()
        return 'Seed Executed'
    }

    private async _insertNewProducts () {
        await this._productsService.deleteAllProducts()
        return
    }
}
```

## Insertar de forma masiva

Vamos a usar los datos del siguiente [gist](https://gist.githubusercontent.com/Klerith/1fb1b9f758bb0c5b2253dfc94f09e1b6/raw/dc3aad39edbecb502b1ed2ff9e6ad4b584d64cd2/seed.ts) para poblar nuestra base de datos, y almacenaremos la información dentro de `seed/data/seed-data.ts`.

Dentro del servicio del seed haremos la inserción de diversos productos a la base de datos mediante la resolución de un conjunto de promesas:

```ts
@Injectable()
export class SeedService {
    ...
    private async _insertNewProducts () {
        await this._productsService.deleteAllProducts()

        const seedProduts = initialData.products

        const insertPromises = []

        seedProduts.forEach( product => {
            insertPromises.push( this._productsService.create( product ) )
        } )

        await Promise.all( insertPromises )

        return
    }
}
```

Finalmente podemos usar el endpoint `​http://localhost:3000/api/seed` para ejecutar el seed, borrar los datos anteriores y poblar la base de datos.

## Renombrar tablas

Podemos renombrar las tablas de nuestra base de datos, desde las entidades del proyecto. Por ejemplo, queremos que nuestras tablas tengan el nombre en plural, por lo tanto hacemos la siguiente modificación:

```ts
@Entity( { name: 'products' } )
export class Product { ... }
```

```ts
@Entity( { name: 'product_images' } )
export class ProductImage {...}
```

Como estamos en desarrollo, podemos eliminar las tablas de la base de datos y levantar nuestro proyecto de nuevo y ejecutar el seed, pero en producción debemos ejecutar una migración.
