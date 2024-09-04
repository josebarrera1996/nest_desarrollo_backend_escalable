import { Manager, Socket } from 'socket.io-client';

let socket: Socket;

export const connectToServer = ( token: string ) => {
    const manager = new Manager( 'http://localhost:3000/socket.io/socket.io.js', {
        extraHeaders: {
            ping: 'pong',
            authentication: `${ token }`
        }
    } );

    socket?.removeAllListeners();
    socket = manager.socket( '/' );

    addListeners();
};


const addListeners = () => {
    const serverStatusSpan = document.querySelector( '#server-status' )!;
    const clientsUl = document.querySelector( '#clients-ul' )!;
    const msgForm = document.querySelector( '#message-form' )! as HTMLFormElement;
    const msgInput = document.querySelector<HTMLInputElement>( '#message-input' )!;
    const messageUl = document.querySelector( '#messages-ul' )!;

    socket.on( 'connect', () => {
        serverStatusSpan.innerHTML = 'connected';
    } );

    socket.on( 'disconnect', () => {
        serverStatusSpan.innerHTML = 'disconnected';
    } );

    socket.on( 'clients-updated', ( clients: string[] ) => {
        let clientsHtml = '';

        clients.forEach( id => {
            clientsHtml += `<li>${ id }</li>`;
        } );

        clientsUl.innerHTML = clientsHtml;
    } );

    msgForm.addEventListener( 'submit', ( event ) => {
        event.preventDefault();

        if ( !msgInput.value.trim().length ) return;

        socket.emit( 'message-client', { id: socket.id, message: msgInput.value } );

        msgInput.value = '';
    } );

    socket.on( 'message-server', ( payload: { fullName: string, message: string; } ) => {
        messageUl.innerHTML += `<li>
            <strong>${ payload.fullName }</strong>
            <span>${ payload.message }</span>
        </li>`;
    } );
};