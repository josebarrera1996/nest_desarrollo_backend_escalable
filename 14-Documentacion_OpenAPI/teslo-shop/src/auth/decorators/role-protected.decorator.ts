import { SetMetadata } from '@nestjs/common';
import { META_ROLES, ValidRoles } from '../constants';

export const RoleProtected = ( ...args: ValidRoles[] ) => SetMetadata( META_ROLES, args );
