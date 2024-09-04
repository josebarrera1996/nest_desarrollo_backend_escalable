import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { ProductImage } from './product-image.entity';
import { ApiProperty } from "@nestjs/swagger";

@Entity( { name: 'products' } )
export class Product {
    @ApiProperty( {
        example: '0334cfd8-ade8-45d7-a37b-3328108a7113',
        description: 'Product Id',
        uniqueItems: true
    } )
    @PrimaryGeneratedColumn( 'uuid' )
    id: string;

    @ApiProperty()
    @Column( 'text', {
        unique: true
    } )
    title: string;

    @ApiProperty()
    @Column( 'float', {
        default: 0
    } )
    price: number;

    @ApiProperty()
    @Column( {
        type: 'text',
        nullable: true
    } )
    description: string;

    @ApiProperty()
    @Column( 'text', {
        unique: true
    } )
    slug: string;

    @ApiProperty()
    @Column( 'int', {
        default: 0
    } )
    stock: number;

    @ApiProperty()
    @Column( 'text', {
        array: true
    } )
    sizes: string[];

    @ApiProperty()
    @Column( 'text' )
    gender: string;

    @ApiProperty()
    @Column( {
        type: 'text',
        array: true,
        default: []
    } )
    tags: string[];

    @ApiProperty()
    @OneToMany(
        () => ProductImage,
        productImage => productImage.product,
        {
            cascade: true,
            eager: true
        }
    )
    images?: ProductImage[];

    @ManyToOne( () => User, ( user ) => user.products, { eager: true } )
    user: User;

    @BeforeInsert()
    @BeforeUpdate()
    checkSlug () {
        if ( !this.slug )
            this.slug = this.title;

        this.slug = this.slug
            .toLowerCase()
            .replaceAll( " ", "_" )
            .replaceAll( "'", '' );
    }
}
