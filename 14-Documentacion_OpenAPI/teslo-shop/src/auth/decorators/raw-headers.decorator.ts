import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const RawHeaders = createParamDecorator( ( data, ctx: ExecutionContext ) => {
    const request = ctx.switchToHttp().getRequest();
    const rawHeaders = request.rawHeaders;

    if ( !rawHeaders ) throw new InternalServerErrorException( 'Raw Headers not found in the request' );

    return rawHeaders;
} );