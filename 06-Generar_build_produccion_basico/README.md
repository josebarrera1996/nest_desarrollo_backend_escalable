# Sección 06: Generar build de producción básico

Esta sección es muy corta, pero muy importante. Seguimos usando el mismo proyecto de la sección anterior. El ideal es generar el build de producción a través del siguiente comando (es importante tener instalado los `node_modules`):

```txt
$: pnpm  build
```

La instrucción anterior genera únicamente la carpeta `dist`. Y para ejecutar la aplicación modo producción, usamos el siguiente comando:

```txt
$: pnpm start:prod
```

En secciones siguientes usaremos docker para crear una imagen de nuestro proyecto y desplegar en un hosting en la nube.
