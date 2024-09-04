import { Module } from '@nestjs/common'
import { DBExceptionService } from './services/db-exception.service'

@Module( {
    providers: [ DBExceptionService ],
    exports: [ DBExceptionService ]
} )
export class CommonsModule { }
