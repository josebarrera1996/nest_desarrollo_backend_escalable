import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
    constructor (
        @InjectRepository( User ) private readonly _userRepository: Repository<User>,
    ) { }

    async runSeed () {
        await this._deleteTables();
        await this._insertUsers();
        return 'Seed Executed';
    }

    private async _deleteTables () {

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
}
