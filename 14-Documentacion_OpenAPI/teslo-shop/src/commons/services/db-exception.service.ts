import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { PostgreSQLErrorCodes } from '../enums/db-error-codes.enum'

@Injectable()
export class DBExceptionService {
    private static logger = new Logger( 'DBExceptionService' )

    /**
     * If the error is a NOT_NULL_VIOLATION or UNIQUE_VIOLATION, throw a BadRequestException, otherwise
     * throw an InternalServerErrorException
     * @param {any} error - any - this is the error object that is passed to the function.
     */
    public static handleDBException ( error: any ): never {
        if ( error.code === PostgreSQLErrorCodes.NOT_NULL_VIOLATION )
            throw new BadRequestException( error.detail )

        if ( error.code === PostgreSQLErrorCodes.UNIQUE_VIOLATION )
            throw new BadRequestException( error.detail )

        this.logger.error( error )
        console.error( error )
        throw new InternalServerErrorException( "Unexpected error, check server logs" )
    }
}
