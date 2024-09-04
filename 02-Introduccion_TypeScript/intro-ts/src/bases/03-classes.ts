import axios from "axios"
import { IPokeAPI, Move } from "../interfaces/pokeapi-response.interface"

export class Pokemon {

    get imageUrl (): string {
        return `https://image/${ this.id }.jpg`
    }

    constructor (
        public readonly id: number,
        public name: string
    ) { }


    scream () {
        console.log( `${ this.name.toUpperCase() }!!!` )
    }

    speak () {
        console.log( `${ this.name }, ${ this.name }` )
    }

    async getMoves (): Promise<Move[]> {
        const response = await axios.get<IPokeAPI>( `https://pokeapi.co/api/v2/pokemon/${ this.id }` )
        const { data: { moves } } = response
        return moves
    }
}


export const saurio = new Pokemon( 1, 'Bulbasaur' )

console.log( await saurio.getMoves() )