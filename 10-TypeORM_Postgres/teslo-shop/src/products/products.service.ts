import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isUUID } from 'class-validator'
import { Repository } from 'typeorm'

import { PaginationDto } from '../commons/dto/pagination.dto'
import { PostgreSQLErrorCodes } from '../commons/enums/db-error-codes.enum'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { Product } from './entities/product.entity'

@Injectable()
export class ProductsService {
    private readonly _logger = new Logger( 'ProductsService' )

    constructor ( @InjectRepository( Product ) private readonly _productRepository: Repository<Product> ) { }

    async create ( createProductDto: CreateProductDto ) {
        try {
            const product = this._productRepository.create( createProductDto )
            await this._productRepository.save( product )
            return product
        } catch ( error ) {
            this._handleDBException( error )
        }
    }

    async findAll ( { limit = 10, offset = 0 }: PaginationDto ) {
        const { 0: data, 1: totalResults } = await this._productRepository.findAndCount( {
            take: limit, skip: offset
        } )
        if ( !data.length || totalResults == 0 )
            throw new NotFoundException( `There aren't results for the search` )
        return { limit, offset, partialResults: data.length, totalResults, data }
    }

    async findOne ( term: string ) {
        let product: Product

        if ( isUUID( term ) )
            product = await this._productRepository.findOneBy( { id: term } )

        if ( !product )
            product = await this._productRepository.createQueryBuilder()
                .where( 'UPPER(title) = UPPER(:title) or slug = LOWER(:slug)', { title: term, slug: term } )
                .getOne()

        if ( !product )
            throw new NotFoundException( `There are no results for the search. Search term: ${ term }` )

        return product
    }

    async update ( id: string, updateProductDto: UpdateProductDto ) {
        const product = await this._productRepository.preload( {
            id, ...updateProductDto
        } )

        if ( !product )
            throw new NotFoundException( `Product with id '${ id }' not found` )

        try {
            return await this._productRepository.save( product )
        } catch ( error ) {
            this._handleDBException( error )
        }
    }

    async remove ( id: string ) {
        const product = await this.findOne( id )
        await this._productRepository.remove( product )
    }

    private _handleDBException ( error: any ) {
        if ( error.code === PostgreSQLErrorCodes.NOT_NULL_VIOLATION )
            throw new BadRequestException( error.detail )

        if ( error.code === PostgreSQLErrorCodes.UNIQUE_VIOLATION )
            throw new BadRequestException( error.detail )

        this._logger.error( error )
        console.error( error )
        throw new InternalServerErrorException( "Unexpected error, check server logs" )
    }
}
