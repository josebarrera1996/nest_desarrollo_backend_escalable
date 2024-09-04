import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object( {
    STAGE: Joi.required().default( 'dev' ),
    DB_HOST: Joi.required().default( 'localhost' ),
    DB_PORT: Joi.number().default( 5433 ),
    DB_USER: Joi.required().default( 'postgres' ),
    DB_PASSWORD: Joi.required(),
    DB_NAME: Joi.required()
} );