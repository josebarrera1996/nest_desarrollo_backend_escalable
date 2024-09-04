import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDTO {
    @ApiProperty( { example: 'test@mail.com' } )
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty( {
        pattern: '/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/',
        minLength: 6,
        maxLength: 50,
        example: 'P44sw0rd'
    } )
    @IsString()
    @MinLength( 6 )
    @MaxLength( 50 )
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    } )
    password: string;

    @ApiProperty( {
        minLength: 1,
        example: 'Name Lastname'
    } )
    @IsString()
    @MinLength( 1 )
    fullName: string;
}