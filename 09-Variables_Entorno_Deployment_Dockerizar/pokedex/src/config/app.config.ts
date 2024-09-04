export const EnvConfiguration = () => ( {
    environment: process.env.NODE_ENV || 'dev',
    mongodb: process.env.MONGO_DB,
    port: Number( process.env.PORT ) || 3001,
    defaultLimit: Number( process.env.DEFAULT_LIMIT ) || 5
} )