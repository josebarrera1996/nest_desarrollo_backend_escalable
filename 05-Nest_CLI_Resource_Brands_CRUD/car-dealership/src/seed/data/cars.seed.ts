import { ICar } from "src/cars/interfaces/cars.interface"
import { v4 as uuid } from 'uuid'


export const CARS_SEED: ICar[] = [
    {
        id: uuid(),
        brand: 'Toyota',
        model: "Corolla"
    },
    {
        id: uuid(),
        brand: 'Honda',
        model: "Civic"
    },
    {
        id: uuid(),
        brand: 'Jeep',
        model: "Cherokee"
    },
]