import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import { CreateCarDTO, UpdateCarDTO } from './dto'
import { ICar } from './interfaces/cars.interface'


@Injectable()
export class CarsService {
    private _cars: ICar[] = [
        {
            id: uuid(),
            brand: 'Toyota',
            model: 'Corolla'
        },
        {
            id: uuid(),
            brand: 'Honda',
            model: 'Civic'
        },
        {
            id: uuid(),
            brand: 'Jeep',
            model: 'Cherokee'
        }
    ]

    public findAll () {
        return [ ...this._cars ]
    }

    public findOneById ( id: string ) {
        const car = { ...this._cars.find( car => car.id === id ) }
        if ( !car || !Object.keys( car ).length )
            throw new NotFoundException( `Car with id ${ id } not found` )
        return car
    }

    public create ( createCarDTO: CreateCarDTO ) {
        const newCar: ICar = { id: uuid(), ...createCarDTO }
        this._cars.push( newCar )
        return newCar
    }

    public update ( id: string, updateCarDTO: UpdateCarDTO ) {
        let carData = this.findOneById( id )

        if ( updateCarDTO.id && updateCarDTO.id !== id )
            throw new BadRequestException( `Car id is not valid inside body` )

        this._cars = this._cars.map( car => {
            if ( car.id === id ) {
                carData = { ...carData, ...updateCarDTO, id }
                return carData
            }
            return car
        } )

        return carData
    }

    public delete ( id: string ) {
        this.findOneById( id )
        this._cars = this._cars.filter( car => car.id !== id )
    }
}
