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

moment.locale(globalConfig.get('momentLocale', 'zh-cn'));

let server: net.Server | undefined = undefined;

export function startHttpStateServer() {
  if (server) {
    return;
  }
  server = net.createServer(async (socket: net.Socket) => {
    socket.on('error', (e: any) => {
      console.warn('HttpStateServer socket.on error.', e);
    });
    const outData = render(`
<html lang="zh">
<header>
    <meta charset="UTF-8"/>
</header>
<body>
now running connect: <%= monitorCenter.connectCount %>
<br/>
now rule: <%= rule %>
<br/>
---------------------------------------------------------------------------------------------
<br/>
<% upstreamPool.forEach(function(u, i){ %>
    <%= i + 1 %>. <%= u.host %>:<%= u.port %>
    online: <% if(!u.isOffline){ %>
        <span style="color: green">True</span>
    <% }else{ %>
        <span style="color: red">False</span>
    <% } %>
    work: <% if(!u.lastConnectFailed){ %>
        <span style="color: green">True</span>
    <% }else{ %>
        <span style="color: red">False</span>
    <% } %> |
    running: <%= u.connectCount %> |
    lastOnlineTime: <%= formatTime(u.lastOnlineTime) %>
    lastConnectTime: <%= formatTime(u.lastConnectTime) %>
    <br/>
<% }); %>
---------------------------------------------------------------------------------------------
<br/>
lastConnectServer:
<% if(monitorCenter.lastConnectServer){ %>
    <%= monitorCenter.lastConnectServer.host + monitorCenter.lastConnectServer.port %>
<% } else { %>
    Undefined
<% } %>
<br/>
<br/>
now time: <%= nowTime %>
<br/>
runTime: <%- runTimeString %>
<br/>
---------------------------------------------------------------------------------------------
<br/>
<pre>
<%- JSON.stringify(upstreamPool, null, 2) %>
</pre>
</body>
</html>

    `, {
      test: 11244,
      upstreamPool: getUpstreamServerAddresses(),
      monitorCenter: refMonitorCenter(),
      formatTime: (m: moment.Moment | undefined) => {
        return m ? m.format('ll HH:mm:ss') : 'undefined';
      },
      rule: getNowRule(),
      nowTime: moment().format('ll HH:mm:ss'),
      runTimeString: moment.duration(refMonitorCenter().startTime.diff(moment())).humanize(),
    });
    const httpRH = `
HTTP/1.0 200 OK
Content-Type: text/html
Connection: Closed
Content-Length: ${Buffer.byteLength(outData, 'utf8')}

`;
    socket.write(httpRH + outData);
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

