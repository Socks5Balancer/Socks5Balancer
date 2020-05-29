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

import {globalConfig} from '../configLoader';
import {render} from 'ejs';
import {refMonitorCenter} from './monitorCenter';
import {
  checkHaveUsableServer,
  endAllConnectOnUpstream,
  getNowRule,
  getUpstreamServerAddresses, setNowRule,
  UpstreamSelectRuleList
} from '../upstreamPool';
import {isString, get, has, parseInt} from 'lodash';
import moment from 'moment';
import express from 'express';

let server: express.Application | undefined = undefined;

export function startHttpStateServer() {
  if (server) {
    return;
  }
  server = express();
  server.use(express.urlencoded({extended: false}));
  const router = express.Router();
  server.use('/', router);
  router.all('/', (req, res) => {

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
<form action="/op" method="get" target="_self">
    <select name="newRule">
        <% UpstreamSelectRuleList.forEach(function(u, i){ %>
            <option value="<%= u %>" <%= u === rule ? 'selected' : '' %>><%= u %></option>
        <% }); %>
    </select>
    <input type="submit" value="Change It"/>
</form>
<% if(!haveUsableServer){ %>
    <h3 style="color: red">Warning: we don't have Usable Server !!! </h3>
    <br/>
<% } %>
---------------------------------------------------------------------------------------------
<br/>
<% upstreamPool.forEach(function(u, i){ %>
    <%= i + 1 %>. <%= u.host %>:<%= u.port %>
    online: <% if(!u.isOffline){ %>
        <span style="color: green">True</span>
    <% } else { %>
        <span style="color: red">False</span>
    <% } %>
    connectable: <% if(!u.lastConnectFailed){ %>
        <span style="color: green">True</span>
    <% } else { %>
        <span style="color: red">False</span>
    <% } %> |
    running: <%= u.connectCount %> |
    lastTCPCheckTime: <%= formatTime(u.lastOnlineTime) %>
    lastConnectCheckTime: <%= formatTime(u.lastConnectTime) %> |
    <% if(u.isManualDisable){ %>
        <span style="color: red">Disabled</span>
        <a href="/op?enable=<%= i %>">Enable It</a>
    <% } else { %>
        <span style="color: green">Enabled</span>
        <a href="/op?disable=<%= i %>">Disable It</a>
    <% } %>
    <a href="/op?endConnectOnServer=<%= i %>">Close Connect</a>
    <br/>
<% }); %>
---------------------------------------------------------------------------------------------
<br/>
lastConnectServer:
<% if(monitorCenter.lastConnectServer){ %>
    <%= monitorCenter.lastConnectServer.host + ':' + monitorCenter.lastConnectServer.port %>
<% } else { %>
    Undefined
<% } %>
<br/>
<br/>
now time: <%= nowTime %>
<br/>
runTime: <%= runTimeString %>
<br/>
runTime: <%= runTimeString2 %>
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
      runTimeString2: formatDuration(-refMonitorCenter().startTime.diff(moment())),
      haveUsableServer: checkHaveUsableServer(),
      UpstreamSelectRuleList: UpstreamSelectRuleList,
    });

    return res.send(outData);
  });
  router.all('/op', (req, res) => {
    console.log('/op:', req);
    const upstreamPool = getUpstreamServerAddresses();
    if (isString(req.query.newRule)) {
      if (UpstreamSelectRuleList.find(v => v === req.query.newRule)) {
        setNowRule(req.query.newRule as any);
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.enable)) {
      const n = parseInt(req.query.enable, 10);
      if (n >= 0 && n < upstreamPool.length) {
        upstreamPool[n].isManualDisable = false;
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.disable)) {
      const n = parseInt(req.query.disable, 10);
      if (n >= 0 && n < upstreamPool.length) {
        upstreamPool[n].isManualDisable = true;
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.endConnectOnServer)) {
      const n = parseInt(req.query.endConnectOnServer, 10);
      if (n >= 0 && n < upstreamPool.length) {
        endAllConnectOnUpstream(upstreamPool[n]);
        res.statusMessage = 'OK';
      }
    }
    res.redirect('/');
  });
  server.on('error', () => {
    console.warn('express error.');
  });
  server.on('listening', () => {
    console.log(`State Server Ready : ` +
      `listenPort:${globalConfig.get('stateServerPort', 5010)} ` +
      `listenHost:${globalConfig.get('stateServerHost', '127.0.0.1')}`
    );
  });
  server.listen(
    globalConfig.get('stateServerPort', 5010),
    globalConfig.get('stateServerHost', '127.0.0.1'),
  );
}


// https://github.com/moment/moment/issues/463#issuecomment-552498641
const formatInt = (int: number): string => {
  if (int < 10) {
    return `0${int}`;
  }
  return `${int}`;
};

export const formatDuration = (time: string | number): string => {
  const seconds = moment.duration(time).seconds();
  const minutes = moment.duration(time).minutes();
  const hours = moment.duration(time).hours();
  if (hours > 0) {
    return `${formatInt(hours)}:${formatInt(minutes)}:${formatInt(seconds)}`;
  }
  if (minutes > 0) {
    return `${formatInt(minutes)}:${formatInt(seconds)}`;
  }
  return `00:${formatInt(seconds)}`;
};
