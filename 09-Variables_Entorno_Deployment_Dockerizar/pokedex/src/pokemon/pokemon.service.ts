import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, Model } from 'mongoose'
import { PaginationDto } from 'src/common/dto/pagination.dto'
import { CreatePokemonDto } from './dto/create-pokemon.dto'
import { UpdatePokemonDto } from './dto/update-pokemon.dto'
import { Pokemon } from './entities/pokemon.entity'

@Injectable()
export class PokemonService {
    private _defaultLimit: number

    constructor (
        @InjectModel( Pokemon.name ) private readonly _pokemonModel: Model<Pokemon>,
        private readonly _configService: ConfigService
    ) {
        this._defaultLimit = this._configService.get<number>( 'defaultLimit' )
    }

    async create ( createPokemonDto: CreatePokemonDto ) {
        createPokemonDto.name = createPokemonDto.name.toLowerCase()
        try {
            const pokemon = await this._pokemonModel.create( createPokemonDto )
            return pokemon
        } catch ( error ) {
            this._handleExceptions( error )
        }
    }

    findAll ( { limit = this._defaultLimit, offset = 0 }: PaginationDto ) {
        return this._pokemonModel
            .find()
            .limit( limit )
            .skip( offset )
            .sort( {
                number: 1
            } )
            .select( '-__v' )
    }

    async findOne ( term: string ) {
        let pokemon: Pokemon
        if ( !isNaN( Number( term ) ) )
            pokemon = await this._pokemonModel.findOne( { number: term } )

        if ( !pokemon && isValidObjectId( term ) )
            pokemon = await this._pokemonModel.findById( term )

        if ( !pokemon )
            pokemon = await this._pokemonModel.findOne( { name: term.toLowerCase().trim() } )

        if ( !pokemon )
            throw new NotFoundException( `Pokemon with id, name or number "${ term }" not found` )

        return pokemon
    }

    async update ( term: string, updatePokemonDto: UpdatePokemonDto ) {
        const pokemon = await this.findOne( term )

        if ( updatePokemonDto.name )
            updatePokemonDto.name = updatePokemonDto.name.toLowerCase()

        try {
            await pokemon.updateOne( updatePokemonDto, { new: true } )

            return { ...pokemon.toJSON(), ...updatePokemonDto }
        } catch ( error ) {
            this._handleExceptions( error )
        }
    }

    async remove ( id: string ) {
        const { deletedCount } = await this._pokemonModel.deleteOne( { _id: id } )
        if ( deletedCount === 0 )
            throw new NotFoundException( `Pokemon with id ${ id } not found` )
        return
    }

    private _handleExceptions ( error: any ) {
        if ( error.code === 11000 )
            throw new BadRequestException( `Pokemon exists in DB ${ JSON.stringify( error.keyValue ) }` )

        console.log( error )
        throw new InternalServerErrorException( `Can't create Pokemon - Check server logs` )
    }
}
