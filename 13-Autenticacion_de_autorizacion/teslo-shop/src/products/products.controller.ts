import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Auth, GetUser } from '../auth/decorators';
import { User } from '../auth/entities/user.entity';
import { PaginationDto } from '../commons/dto/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller( 'products' )
@Auth()
export class ProductsController {
    constructor ( private readonly productsService: ProductsService ) { }

    @Post()
    create ( @Body() createProductDto: CreateProductDto, @GetUser() user: User ) {
        return this.productsService.create( createProductDto, user );
    }

    @Get()
    findAll ( @Query() paginationDto: PaginationDto ) {
        return this.productsService.findAll( paginationDto );
    }

    @Get( ':term' )
    findOne ( @Param( 'term' ) term: string ) {
        return this.productsService.findOnePlain( term );
    }

    @Patch( ':id' )
    update (
        @Param( 'id', ParseUUIDPipe ) id: string,
        @Body() updateProductDto: UpdateProductDto,
        @GetUser() user: User
    ) {
        return this.productsService.update( id, updateProductDto, user );
    }

    @Delete( ':id' )
    remove ( @Param( 'id', ParseUUIDPipe ) id: string ) {
        return this.productsService.remove( id );
    }
}
