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

import net from 'net';
import {globalConfig} from '../configLoader';
import {render} from 'ejs';
import {refMonitorCenter} from './monitorCenter';
import {getNowRule, getUpstreamServerAddresses} from '../upstreamPool';
import {isNil} from 'lodash';
import moment from 'moment';

let server: net.Server | undefined = undefined;

export function startHttpStateServer() {
  if (server) {
    return;
  }
  server = net.createServer(async (socket: net.Socket) => {
    const outData = render(`
    now running connect: <%= monitorCenter.connectCount %>
    now rulet: <%= rule %>
---------------------------------------------------------------------------------------------
<% upstreamPool.forEach(function(u, i){ %>
    <%= i + 1 %>. <%= u.host %>:<%= u.port %> online:<%= !u.isOffline %> work:<%= !u.lastConnectFailed %> | running: <%= u.connectCount %> | lastOnlineTime:<%= formatTime(u.lastOnlineTime) %> lastConnectTime:<%= formatTime(u.lastConnectTime) %>
<% }); %>
---------------------------------------------------------------------------------------------
    now time: <%= nowTime %>
    `, {
      test: 11244,
      upstreamPool: getUpstreamServerAddresses(),
      monitorCenter: refMonitorCenter(),
      formatTime: (m: moment.Moment | undefined) => {
        return m ? m.format('YYYY-MM-DD HH:mm:ss') : 'undefined';
      },
      rule: getNowRule(),
      nowTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
    socket.write(outData);
    socket.end();
  }).listen(
    globalConfig.get('stateServerPort', 5010),
    globalConfig.get('stateServerHost', '127.0.0.1'),
    () => {
      console.log(`State Server Ready : ` +
        `listenPort:${globalConfig.get('stateServerPort', 5010)} ` +
        `listenHost:${globalConfig.get('stateServerHost', '127.0.0.1')}`
      );
    }
  );
}

