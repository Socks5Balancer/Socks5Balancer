declare module 'socks5-https-client' {
  import {ClientRequest, IncomingMessage} from 'http';

  function get(url: string | {
    host?: string,
    port?: number,
    hostname?: string,
    socksHost?: string,
    socksPort?: number,
    socksUsername?: string,
    socksPassword?: string,
  }, callback: (res: IncomingMessage) => void): ClientRequest;
}
