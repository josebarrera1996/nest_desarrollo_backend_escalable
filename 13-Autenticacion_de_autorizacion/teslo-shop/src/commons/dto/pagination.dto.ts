import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator'

export class PaginationDto {
    @IsOptional()
    @Type( () => Number )
    @IsPositive()
    limit?: number

    @IsOptional()
    @Type( () => Number )
    @IsNumber()
    @Min( 0 )
    offset?: number
}