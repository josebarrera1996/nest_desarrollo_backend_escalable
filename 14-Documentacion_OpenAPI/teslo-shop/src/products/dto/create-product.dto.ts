import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
    @ApiProperty( {
        description: 'Product title (unique)',
        uniqueItems: true
    } )
    @IsString()
    @MinLength( 1 )
    title: string;

    @ApiProperty()
    @IsOptional()
    @IsNumber()
    @IsPositive()
    price?: number;

    @ApiProperty()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty( {
        required: false
    } )
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty()
    @IsOptional()
    @IsInt()
    @IsPositive()
    stock?: number;

    @ApiProperty()
    @IsString( { each: true } )
    @IsArray()
    sizes: string[];

    @ApiProperty()
    @IsIn( [ 'men', 'women', 'kid', 'unisex' ] )
    gender: string;

    @ApiProperty()
    @IsOptional()
    @IsString( { each: true } )
    @IsArray()
    tags?: string[];

    @ApiProperty()
    @IsOptional()
    @IsString( { each: true } )
    @IsArray()
    images?: string[];
}
