declare module 'socks5-http-client' {
  function get(url: string | {
    host?: string,
    port?: number,
    hostname?: string,
    socksHost?: string,
    socksPort?: number,
    socksUsername?: string,
    socksPassword?: string,
  }, callback: (res) => void);
}
