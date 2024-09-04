const Deprecated = ( deprecationReason: string ) => {
    return ( target: any, memberName: string, propertyDescriptor: PropertyDescriptor ) => {
        return {
            get () {
                const wrapperFn = ( ...args: any[] ) => {
                    console.warn( `Method ${ memberName } is deprecated with reason: ${ deprecationReason }` )
                    //? Hacer uso de la función sobre la que se usa el decorador
                    propertyDescriptor.value.apply( this, args )
                }
                return wrapperFn
            }
        }
    }
}


export class Pokemon {
    constructor (
        public readonly id: number,
        public name: string
    ) { }

    scream () {
        console.log( `${ this.name.toUpperCase() }!!!` )
    }

    @Deprecated( "Most use speak2 method instead" )
    speak () {
        console.log( `${ this.name }, ${ this.name }` )
    }

    speak2 () {
        return `${ this.name }, ${ this.name } 🐾`
    }
}


export const charmander = new Pokemon( 4, 'Charmander' )