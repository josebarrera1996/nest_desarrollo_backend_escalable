import axios from 'axios'


export interface HttpAdapter {
    get<T> ( url: string ): Promise<T>
}


export class PokeApiFetchAdapter implements HttpAdapter {
    async get<T> ( url: string ): Promise<T> {
        const response = await fetch( url )
        const data: T = await response.json()
        return data
    }
}


export class PokeApiAxiosAdapter implements HttpAdapter {
    private readonly _axios = axios

    async get<T> ( url: string ): Promise<T> {
        const { data } = await this._axios.get<T>( url )
        return data
    }
}