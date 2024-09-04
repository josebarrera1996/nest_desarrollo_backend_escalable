import { Injectable } from '@nestjs/common'

@Injectable()
export class CarsService {
    private _cars = [
        {
            id: 1,
            brand: 'Toyota',
            model: 'Corolla'
        },
        {
            id: 2,
            brand: 'Honda',
            model: 'Civic'
        },
        {
            id: 3,
            brand: 'Jeep',
            model: 'Cherokee'
        }
    ]

    public findAll () {
        return [ ...this._cars ]
    }

    public findOneById ( id: number ) {
        return { ...this._cars.find( car => car.id === id ) }
    }
}
