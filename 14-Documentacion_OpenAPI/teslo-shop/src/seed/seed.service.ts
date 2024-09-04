import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
        private readonly _productsService: ProductsService
    ) { }

    async runSeed () {
        await this._deleteTables();
        const adminUser = await this._insertUsers();
        await this._insertNewProducts( adminUser );
        return 'Seed Executed';
    }

    private async _deleteTables () {
        await this._productsService.deleteAllProducts();

        await this._userRepository
            .createQueryBuilder()
            .delete()
            .where( {} )
            .execute();
    }

    private async _insertUsers () {
        const seedUsers = initialData.users;

        const users: User[] = [];

        seedUsers.forEach( user => {
            users.push( this._userRepository.create( user ) );
        } );

        const dbUsers = await this._userRepository.save( users );

        return dbUsers[ 0 ];
    }

    private async _insertNewProducts ( user: User ) {
        await this._productsService.deleteAllProducts();

        const seedProduts = initialData.products;

        const insertPromises = [];

        seedProduts.forEach( product => {
            insertPromises.push( this._productsService.create( product, user ) );
        } );

        await Promise.all( insertPromises );

        return;
    }
}
