declare namespace NodeJS {
    interface ProcessEnv {
        STAGE: string,
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