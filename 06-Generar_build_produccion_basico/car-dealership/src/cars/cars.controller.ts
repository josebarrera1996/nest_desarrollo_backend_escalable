import { Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { CarsService } from './cars.service'
import { CreateCarDTO, UpdateCarDTO } from './dto'


@Controller( 'cars' )
export class CarsController {

    constructor ( private readonly _carsService: CarsService ) { }

    @Get()
    getAllCars () {
        return this._carsService.findAll()
    }

    @Get( ':id' )
    getCarById ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string ) {
        const data = this._carsService.findOneById( uuid )

        return {
            id: uuid,
            data
        }
    }

    @Post()
    createCar ( @Body() createCarDTO: CreateCarDTO ) {
        const data = this._carsService.create( createCarDTO )
        return {
            ok: true, method: 'POST',
            data
        }
    }

    @Patch( ':id' )
    updateCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string, @Body() updateCarDTO: UpdateCarDTO ) {
        const data = this._carsService.update( uuid, updateCarDTO )
        return {
            ok: true,
            method: 'PATCH',
            data
        }
    }

    @Delete( ':id' )
    deleteCar ( @Param( 'id', new ParseUUIDPipe( { version: '4' } ) ) uuid: string ) {
        this._carsService.delete( uuid )

        return {
            ok: true,
            method: 'DELETE',
            id: uuid
        }
    }
}
