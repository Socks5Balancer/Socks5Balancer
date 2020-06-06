/**
 * Socks5Balancer : A Simple TCP Socket Balancer for balance Multi Socks5 Proxy Backend
 * Copyright (C) <2020>  <Jeremie>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import bluebird from 'bluebird';
// import {assignIn} from 'lodash';
// https://stackoverflow.com/questions/16995184/nodejs-what-does-socket-hang-up-actually-mean
// import shttp from 'socks5-http-client';
import shttps from 'socks5-https-client';
import {IncomingMessage} from 'http';
import net from 'net'
import {globalConfig} from './configLoader';

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
    const cr = shttps.get(opt, (res: IncomingMessage) => {
      res.setEncoding('utf8');
      // resolve(res);
      resolve(`${res.statusCode}, ${res.statusMessage}`);
      // res.on('readable', () => {
      //   // console.log(res.read()); // Log response to console.
      //   resolve(res.read());
      // });
    }).on('timeout', () => {
      reject(new bluebird.TimeoutError('request timeout.'));
    }).on('error', (err: Error) => {
      console.error(`testSocks5 error on ${socksHost}:${socksPort}:`, err);
      reject(err);
    });
    cr.setTimeout(globalConfig.get('socksTestTimeout', 15 * 1000), () => {
      console.error(`testSocks5 socket timeout on ${socksHost}:${socksPort}:`, cr.socket);
      cr.socket.destroy();
      reject(new bluebird.TimeoutError('request timeout.'));
    });
  });
}

export async function testTcp(
  socksHost: string = '127.0.0.1',
  socksPort: number = 1080,
) {
  // try to connect
  const p = new bluebird<net.Socket>((resolve, reject) => {
    try {
      const _s = net.createConnection(socksPort, socksHost, () => {
        resolve(_s);
      });
      _s.on('error', e => {
        reject(e);
      });
    } catch (e) {
      reject(e);
    }
  });
  // if timeout, will throw a bluebird.TimeoutError
  // http://bluebirdjs.com/docs/api/timeout.html
  return p.timeout(globalConfig.get('connectTimeout', 2 * 1000)).then(s => {
    // we only test it can be connect
    s.end();
    s.destroy();
    return true;
  }).catch(e => {
    console.error(`testTcp error on ${socksHost}:${socksPort}:`, e);
    return false;
  });
}

export async function testSocks5Handshake(
  socksHost: string = '127.0.0.1',
  socksPort: number = 1080,
) {
  // try to connect
  const p = new bluebird<net.Socket>((resolve, reject) => {
    try {
      const _s = net.createConnection(socksPort, socksHost, () => {
        // socks5 handshake client to server
        _s.write(Uint8Array.from([0x05, 0x01, 0x00]));
      });
      _s.on('error', e => {
        reject(e);
      });
      _s.once('data', (data) => {
        // socks5 handshake server answer client
        if (data[0] === 0x05 && data[1] === 0x00) {
          // console.log('data:', data);
          resolve(_s);
        } else {
          console.error('testTcp socks5 handshake server answer wrong, data:', data);
          reject(_s);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
  // if timeout, will throw a bluebird.TimeoutError
  // http://bluebirdjs.com/docs/api/timeout.html
  return p.timeout(globalConfig.get('connectTimeout', 2 * 1000)).then(s => {
    // we only test it can be connect
    s.end();
    s.destroy();
    return true;
  }).catch(e => {
    console.error(`testTcp error on ${socksHost}:${socksPort}:`, e);
    return false;
  });
}
