# Sección 16: Desplegar toda la aplicación a producción

Esta sección trabajaremos en desplegar todo el backend y frontend, pero puntualmente aprenderemos:

- Heroku CLI
- Logs y Tails de logs
- Manejo de errores en producción
- Configuración de variables de entorno
- Postgres en la nube
- Despliegue en Netlify
- Pruebas de aplicación
- CORS
- Generar build de producción VITE
- y mucho más

## Continuación de la sección

Para esta sección vamos a usar el proyecto de la sección anterior, por lo que vamos a copiar el proyecto con el siguiente comando:

```txt
$: cp -r 15-Websockets/teslo-websockets 16-Desplegar_aplicacion_produccion
$: cp -r 15-Websockets/ws-client 16-Desplegar_aplicacion_produccion
```

Hacemos la instalación de los `node_modules` con el siguiente comando:

```txt
$: pnpm install
```

Levantamos la base de datos con el comando:

```txt
$: docker-compose up -d
```

Y levantamos el proyecto backend con el siguiente comando:

```txt
$: pnpm start:dev
```

En caso de no tener registros en la base de datos, vamos a ejecutar el siguiente endpoint: `http://localhost:3000/api/seed`

Para el proyecto cliente frontend usamos el siguiente comando para levantar la aplicación:

```txt
$: pnpm dev
```

## Postgres en la nube

Nuestra base de datos actualmente se encuentra en local y es gratuita, pero, al momento de pensar en la nube tenemos el problema de que para publicar y usar una imagen de docker debemos pagar. Una opción es hacer uso de AWS, Heroku, Railway, Render, etc.

Cuando tenemos listo el servicio de la base de datos debemos obtener la configuración de conexión para enlazarla a las variables del proyecto backend.

## Configuraciones faltantes para despliegue

Dentro de las variables de entorno definimos una variable para establecer la etapa del proyecto:

```env
STAGE=dev
```

Luego, en la configuración de TypeORM debemos reconocer dicha variable en la propiedad de `ssl` y en `extra` para establecer una configuración especifica:

```ts
@Module( {
    imports: [
        ...,
        TypeOrmModule.forRoot( {
            ssl: process.env.STAGE === 'prod',
            extra: {
                ssl: process.env.STAGE === 'prod'
                    ? { rejectUnauthorized: true }
                    : null
            },
            ...
        } ),
        ...
    ],
} )
export class AppModule { }
```

Otra configuración que tendremos en cuenta será establecer el motor de node que se debería usar en la plataforma en la nube, y para ello definimos la configuración en `package.json`:

```json
{
    ...,
    "engines": {
        "node": "17.x"
    },
    ...
}
```

Al momento de lanzar el proyecto se ejecutara el comando `npm run build` y posterior `npm run start`, para el cual debemos cambiar el valor por lo siguiente:

```json
{
    ...,
    "scripts": {
        ...,
        "start": "node dist/main",
        ...,
        "start:prod": "nest start",
        ...
    },
    ...
}
```
