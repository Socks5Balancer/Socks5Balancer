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
// Create the proxy server
import net from 'net';
import {globalConfig} from './configLoader';
import {
  getServerBasedOnAddress,
  getUpstreamServerSocketStorage,
  SocketStoragePair,
  updateActiveTime,
  updateOnlineTime
} from './upstreamPool';
import bluebird from 'bluebird';
import moment from 'moment';
import {refMonitorCenter} from './stateServer/monitorCenter';
import {PipListener} from './stateServer/PipListener';

let server: net.Server | undefined = undefined;

export function getListenInfo() {
  return {
    listenPort: globalConfig.get('listenPort', 5000),
    listenHost: globalConfig.get('listenHost', '127.0.0.1'),
  };
}

export function initServer() {
  if (server) {
    return;
  }
  server = net.createServer(async (socket: net.Socket) => {

    updateActiveTime();

    socket.on('error', e => {
      // console.warn(`a error come from frontend:`, e);
    });

    for (let i = 0; i < globalConfig.get('retryTimes', 3); ++i) {
      // retry 3 times
      try {
        // get a server
        const upstream = getServerBasedOnAddress(socket.remoteAddress);
        if (!upstream) {
          socket.end();
          console.error('cannot get valid upstream.');
          // socket.destroy(new Error('cannot get valid upstream.'));
          return;
        }

        // try to connect
        const p = new bluebird<net.Socket>((resolve, reject) => {
          try {
            const _s = net.createConnection(upstream.port, upstream.host, () => {
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
        await p.timeout(globalConfig.get('connectTimeout', 2 * 1000)).then(s => {
          // if ok, connect each other
          const pUp = new PipListener();
          const pDown = new PipListener();
          socket.pipe(pUp).pipe(s);
          s.pipe(pDown).pipe(socket);

          const uSubUp = pUp.asObservable().subscribe(value => {
            refMonitorCenter().upstreamServerDataStatistical[upstream.index].up.count += value.countDiff;
          });
          const uSubDown = pDown.asObservable().subscribe(value => {
            refMonitorCenter().upstreamServerDataStatistical[upstream.index].down.count += value.countDiff;
          });

          pUp.once('end', () => {
            uSubUp.unsubscribe();
          });
          pDown.once('end', () => {
            uSubDown.unsubscribe();
          });
          pUp.once('error', () => {
            uSubUp.unsubscribe();
          });
          pDown.once('error', () => {
            uSubDown.unsubscribe();
          });

          console.log(`connected to ${upstream.host}:${upstream.port}`);
          updateOnlineTime(upstream);
          ++upstream.connectCount;
          ++refMonitorCenter().connectCount;
          refMonitorCenter().lastConnectServer = upstream;
          const ssp: SocketStoragePair = {
            up: socket,
            down: s,
          };
          getUpstreamServerSocketStorage()[upstream.index].add(ssp);
          socket.on('close', () => {
          });
          s.on('close', () => {
            if (getUpstreamServerSocketStorage()[upstream.index].has(ssp)) {
              getUpstreamServerSocketStorage()[upstream.index].delete(ssp);
              --refMonitorCenter().connectCount;
              --upstream.connectCount;
            }
          });
          s.on('error', e => {
            if (getUpstreamServerSocketStorage()[upstream.index].has(ssp)) {
              getUpstreamServerSocketStorage()[upstream.index].delete(ssp);
              --refMonitorCenter().connectCount;
              --upstream.connectCount;
            }
            if (globalConfig.get('internalBehavior.connectResetMeansOffline', true)) {
              upstream.isOffline = true;
            }
            // console.warn(`a error come from backend: ${upstream.host}:${upstream.port} of:`, e);
          });
          socket.on('error', e => {
            // console.warn(`a error come from frontend after connected to backend: ${upstream.host}:${upstream.port} of:`, e);
          });
        });
        // if no error, dont retry and break the for-loop
        return;
      } catch (e) {
        // timeout , retry it
      }
    }

    // retry failed
    socket.end();
    console.error('cannot try valid upstream.');
    // socket.destroy(new Error('Cannot try valid upstream.'));

  }).listen(
    getListenInfo().listenPort,
    getListenInfo().listenHost,
    () => {
      console.log(`Ready to proxy data, ` +
        `listenPort:${globalConfig.get('listenPort', 5000)} ` +
        `listenHost:${globalConfig.get('listenHost', '127.0.0.1')}`
      );
    }
  );
}
