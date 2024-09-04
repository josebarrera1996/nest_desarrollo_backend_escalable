export interface IPokeResponse {
    count: number
    next: string
    previous: string,
    results: ISmallPokemon[]
}

export interface ISmallPokemon {
    name: string
    url: string
}