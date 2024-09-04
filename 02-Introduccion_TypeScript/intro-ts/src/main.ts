import { charmander } from './bases/06-decorators'
import './style.css'



document.querySelector<HTMLDivElement>( '#app' )!.innerHTML = `
    <div>
        <h1>Hello Vite!!!<h1>
        <pre>${ JSON.stringify( charmander, null, 4 ) }</pre>
        <pre>${ charmander.speak2() }</pre>
    </div>
`