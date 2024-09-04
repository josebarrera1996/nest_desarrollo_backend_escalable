import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AxiosAdapter } from 'src/common/adapters/axios.adapter'
import { Pokemon } from 'src/pokemon/entities/pokemon.entity'
import { IPokeResponse } from './interfaces/poke-res.interface'

@Injectable()
export class SeedService {

    constructor (
        private readonly _http: AxiosAdapter,
        @InjectModel( Pokemon.name ) private readonly _pokemonModel: Model<Pokemon>
    ) { }

    async populateDB () {
        await this._pokemonModel.deleteMany( {} )

        const { results } = await this._http.get<IPokeResponse>( `https://pokeapi.co/api/v2/pokemon?limit=2000` )

        const pokemonToInsert: { name: string, number: number }[] = []

        results.forEach( async ( { name, url } ) => {
            const segments = url.split( '/' )
            const number: number = +segments[ segments.length - 2 ]
            pokemonToInsert.push( { name, number } )
        } )

        await this._pokemonModel.insertMany( pokemonToInsert )

        return "Seed Executed"
    }
}
