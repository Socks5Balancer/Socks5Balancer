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

// https://stackoverflow.com/questions/24857127/redirecting-clients-from-one-node-js-server-to-another-node-js-server
import net from 'net';
import {promisify} from 'util';
import bluebird from 'bluebird';


// The servers we will proxy to
const upstreamServerAddresses: { host: string, port: number }[] = [
  {host: '127.0.0.1', port: 3000},
  {host: '127.0.0.1', port: 3001},
  {host: '127.0.0.1', port: 3002},
];

// This is where you pick which server to proxy to
// for examples sake, I choose a random one
function getServerBasedOnAddress(host: string | undefined) {
  return upstreamServerAddresses[Math.floor((Math.random() * 3))]
}


// Create the proxy server
net.createServer(async (socket: net.Socket) => {

  for (let i = 0; i < 3; ++i) {
    // retry 3 times
    try {
      // get a server
      const upstream = getServerBasedOnAddress(socket.remoteAddress);

      // try to connect
      const p = new bluebird<net.Socket>((resolve, reject) => {
        try {
          const _s = net.createConnection(upstream.port, upstream.host, () => {
            resolve(_s);
          });
        } catch (e) {
          reject(e);
        }
      });
      // if timeout, will throw a bluebird.TimeoutError
      // http://bluebirdjs.com/docs/api/timeout.html
      await p.timeout(2 * 1000).then(s => {
        // if ok, connect each other
        socket.pipe(s);
        s.pipe(socket);
      });
      // if no error, dont retry and break the for-loop
      break;
    } catch (e) {
      // timeout , retry it
    }
  }

  // retry failed
  socket.end();
  socket.destroy(new Error('Cannot find valid upstream.'));

}).listen(5000, () => {
  console.log('Ready to proxy data');
});

// Create the test upstream servers
// tslint:disable-next-line:prefer-for-of
for (let i = 0; i < upstreamServerAddresses.length; i++) {
  const upstream = upstreamServerAddresses[i];

  net.createServer((socket) => {
    socket.on('data', (data) => {
      console.log('Received some data on ' + upstream.host + ':' + upstream.port);
      console.log(data);
    });
  }).listen(upstream.port);
}
