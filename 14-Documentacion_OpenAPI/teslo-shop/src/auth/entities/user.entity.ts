import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../products/entities';

@Entity( 'users' )
export class User {
    @PrimaryGeneratedColumn( 'uuid' )
    id: string;

    @Column( 'text', {
        unique: true
    } )
    email: string;

    @Column( {
        type: 'text',
        select: false
    } )
    password: string;

    @Column( 'text' )
    fullName: string;

    @Column( 'bool', {
        default: true
    } )
    isActive: boolean;

    @Column( {
        type: 'text',
        array: true,
        default: [ 'user' ]
    } )
    roles: string[];

    @OneToMany( () => Product, ( product ) => product.user )
    products: Product[];

    @BeforeInsert()
    @BeforeUpdate()
    checkFieldsBeforeInsertOrUpdate () {
        this.email = this.email.toLowerCase().trim();
    }
}
