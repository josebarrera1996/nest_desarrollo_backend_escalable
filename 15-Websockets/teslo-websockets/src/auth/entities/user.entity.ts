import { ApiProperty } from '@nestjs/swagger';
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ValidRoles } from '../constants';

@Entity( 'users' )
export class User {
    @ApiProperty( { uniqueItems: true, required: false } )
    @PrimaryGeneratedColumn( 'uuid' )
    id: string;

    @ApiProperty( { uniqueItems: true } )
    @Column( { type: 'text', unique: true } )
    email: string;

    @ApiProperty()
    @Column( { type: 'text', select: false } )
    password: string;

    @ApiProperty( {} )
    @Column( 'text' )
    fullName: string;

    @ApiProperty( { default: true } )
    @Column( { type: 'bool', default: true } )
    isActive: string;

    @ApiProperty( { enum: ValidRoles, isArray: true, required: false } )
    @Column( { type: 'text', array: true, default: [ ValidRoles.USER ] } )
    roles: ValidRoles[];

    @BeforeInsert()
    @BeforeUpdate()
    checkFieldsBeforeInsertOrUpdate () {
        this.email = this.email.toLowerCase().trim();
    }
}