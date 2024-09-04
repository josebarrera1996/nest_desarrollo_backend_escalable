import * as bcrypt from 'bcrypt';
import { ValidRoles } from '../../auth/constants';

interface SeedUser {
    email: string;
    fullName: string;
    password: string;
    roles: ValidRoles[];
}

interface SeedData {
    users: SeedUser[];
}


export const initialData: SeedData = {
    users: [
        {
            email: "test1@mail.com",
            fullName: "Test 1",
            password: bcrypt.hashSync( "test123", 10 ),
            roles: [ ValidRoles.ADMIN ]
        },
        {
            email: "test2@mail.com",
            fullName: "Test 2",
            password: bcrypt.hashSync( "test123", 10 ),
            roles: [ ValidRoles.ADMIN, ValidRoles.USER ]
        }
    ]
};