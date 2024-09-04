/* 
export const pokemonIds = [ 1, 2, 3, 4, 5 ]

pokemonIds.push( 'string' )

pokemonIds.push( +'10' )
pokemonIds.push( Number( '11' ) )

console.log( pokemonIds ) 
*/



export interface IPokemon {
    id: number
    name: string
    age?: number
}

export const saurio: IPokemon = {
    id: 1,
    name: "saurio"
}

export const charmander: IPokemon = {
    id: 2,
    name: 'charmander',
    age: 10
}

export const arr: IPokemon[] = []

arr.push( saurio, charmander )