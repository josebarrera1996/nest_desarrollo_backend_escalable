import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { FilesService } from './files.service';
import { fileFilter, fileNamer } from './helpers';

@ApiTags( 'Files' )
@Controller( 'files' )
export class FilesController {
    constructor ( private readonly filesService: FilesService, private readonly _configService: ConfigService ) { }

    @Post( 'product' )
    @UseInterceptors( FileInterceptor( 'file', {
        fileFilter: fileFilter,
        storage: diskStorage( {
            destination: './static/products',
            filename: fileNamer
        } )
    } ) )
    uploadProductImage ( @UploadedFile() file: Express.Multer.File, ) {
        if ( !file ) throw new BadRequestException( "Make sure that the file is an image" );

        const secureUrl = `${ this._configService.get( 'HOST_API' ) }/files/product/${ file.filename }`;

        return { secureUrl };
    }

    @Get( 'product/:imageName' )
    findProductImage ( @Param( 'imageName' ) imageName: string, @Res() res: Response ) {
        const path = this.filesService.getStaticProductImage( imageName );
        return res.sendFile( path );
    }
}
