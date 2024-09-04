import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isUUID } from 'class-validator'
import { DataSource, Repository } from 'typeorm'

import { PaginationDto } from '../commons/dto/pagination.dto'
import { PostgreSQLErrorCodes } from '../commons/enums/db-error-codes.enum'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { Product, ProductImage } from './entities'

@Injectable()
export class ProductsService {
    private readonly _logger = new Logger( 'ProductsService' )

    constructor (
        @InjectRepository( Product ) private readonly _productRepository: Repository<Product>,
        @InjectRepository( ProductImage ) private readonly _productImageRepository: Repository<ProductImage>,
        private readonly _dataSource: DataSource
    ) { }

    async create ( createProductDto: CreateProductDto ) {
        try {
            const { images = [], ...productDetails } = createProductDto

            const product = this._productRepository.create( {
                ...productDetails,
                images: images.map( url => this._productImageRepository.create( { url } ) )
            } )

            await this._productRepository.save( product )
            return { ...product, images }
        } catch ( error ) {
            this._handleDBException( error )
        }
    }

    async findAll ( { limit = 10, offset = 0 }: PaginationDto ) {
        const { 0: data, 1: totalResults } = await this._productRepository.findAndCount( {
            take: limit, skip: offset,
            relations: {
                images: true
            }
        } )
        if ( !data.length || totalResults == 0 )
            throw new NotFoundException( `There aren't results for the search` )

        return {
            offset, limit,
            partialResults: data.length, totalResults,
            data: data.map( ( { images, ...product } ) => ( { ...product, images: images.map( img => img.url ) } ) )
        }
    }

    async findOne ( term: string ) {
        let product: Product

        if ( isUUID( term ) )
            product = await this._productRepository.findOneBy( { id: term } )

        if ( !product )
            product = await this._productRepository.createQueryBuilder( 'product' )
                .where( 'UPPER(title) = UPPER(:title) or slug = LOWER(:slug)', { title: term, slug: term } )
                .leftJoinAndSelect( 'product.images', 'productImages' )
                .getOne()

        if ( !product )
            throw new NotFoundException( `There are no results for the search. Search term: ${ term }` )

        return product
    }

    async findOnePlain ( term: string ) {
        const { images = [], ...rest } = await this.findOne( term )
        return {
            ...rest,
            images: images.map( image => image.url )
        }
    }

    async update ( id: string, updateProductDto: UpdateProductDto ) {
        const { images, ...toUpdate } = updateProductDto

        const product = await this._productRepository.preload( {
            id, ...toUpdate
        } )

        if ( !product )
            throw new NotFoundException( `Product with id '${ id }' not found` )

        const queryRunner = this._dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            if ( images ) {
                await queryRunner.manager.delete( ProductImage, {
                    product: { id }
                } )

                product.images = images.map( url => this._productImageRepository.create( { url } ) )
            }

            await queryRunner.manager.save( product )
            await queryRunner.commitTransaction()
            await queryRunner.release()

            return this.findOnePlain( id )

        } catch ( error ) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()

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

    async deleteAllProducts () {
        const query = this._productRepository.createQueryBuilder( 'product' )

        try {
            return await query
                .delete()
                .where( {} )
                .execute()
        } catch ( error ) {
            this._handleDBException( error )
        }
    }
}
