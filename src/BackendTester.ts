import bluebird from 'bluebird';
// import {assignIn} from 'lodash';
// https://stackoverflow.com/questions/16995184/nodejs-what-does-socket-hang-up-actually-mean
// import shttp from 'socks5-http-client';
import shttps from 'socks5-https-client';
import {IncomingMessage} from 'http';

export function testSocks5(
  socksHost: string = '127.0.0.1',
  socksPort: number = 1080,
  host: string = 'www.google.fr',
  port: number = 443,
): Promise<string | any> {
  return new bluebird((resolve, reject) => {
    const opt = {
      socksHost: socksHost,
      socksPort: socksPort,
      host: host,
      port: port,
    };
    shttps.get(opt, (res: IncomingMessage) => {
      res.setEncoding('utf8');
      // resolve(res);
      resolve(`${res.statusCode}, ${res.statusMessage}`);
      // res.on('readable', () => {
      //   // console.log(res.read()); // Log response to console.
      //   resolve(res.read());
      // });
    }).on('timeout', () => {
      reject(new bluebird.TimeoutError('request timeout.'));
    }).on('error', err => {
      reject(err);
    });
  });
}
