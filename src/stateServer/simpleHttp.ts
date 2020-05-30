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
  cleanAllCheckState,
  endAllConnectOnUpstream,
  forceCheckNow,
  forceSetLastUseUpstreamIndex, getLastUseUpstreamIndex,
  getNowRule,
  getUpstreamServerAddresses,
  setNowRule,
  UpstreamSelectRuleList,
} from '../upstreamPool';
import {isString, get, has, parseInt, isNil} from 'lodash';
import moment from 'moment';
import express from 'express';
import {getListenInfo} from '../server';

let server: express.Application | undefined = undefined;

function speed2String(s: number) {
  if (s < 1024) {
    return '' + s + 'Byte/s';
  } else if (s < Math.pow(1024, 2)) {
    return '' + formatNumber2FixedLength(s / Math.pow(1024, 1)) + 'KB/s';
  } else if (s < Math.pow(1024, 3)) {
    return '' + formatNumber2FixedLength(s / Math.pow(1024, 2)) + 'MB/s';
  } else if (s < Math.pow(1024, 4)) {
    return '' + formatNumber2FixedLength(s / Math.pow(1024, 3)) + 'GB/s';
  } else if (s < Math.pow(1024, 5)) {
    return '' + formatNumber2FixedLength(s / Math.pow(1024, 4)) + 'TB/s';
  } else if (s < Math.pow(1024, 6)) {
    return '' + formatNumber2FixedLength(s / Math.pow(1024, 5)) + 'EB/s';
  }
}

function dataCount2String(d: number) {
  if (d < 1024) {
    return '' + d + 'Byte';
  } else if (d < Math.pow(1024, 2)) {
    return '' + formatNumber2FixedLength(d / Math.pow(1024, 1)) + 'KB';
  } else if (d < Math.pow(1024, 3)) {
    return '' + formatNumber2FixedLength(d / Math.pow(1024, 2)) + 'MB';
  } else if (d < Math.pow(1024, 4)) {
    return '' + formatNumber2FixedLength(d / Math.pow(1024, 3)) + 'GB';
  } else if (d < Math.pow(1024, 5)) {
    return '' + formatNumber2FixedLength(d / Math.pow(1024, 4)) + 'TB';
  } else if (d < Math.pow(1024, 6)) {
    return '' + formatNumber2FixedLength(d / Math.pow(1024, 5)) + 'EB';
  }
}

export function startHttpStateServer() {
  if (server) {
    return;
  }
  server = express();
  server.use(express.urlencoded({extended: false}));
  const router = express.Router();
  server.use('/', router);
  router.all('/', (req, res) => {

    const speedArray: string[] = new Array(getUpstreamServerAddresses().length).fill('');
    const dataArray: string[] = new Array(getUpstreamServerAddresses().length).fill('');

    if (speedArray.length === refMonitorCenter()?.upstreamServerDataStatistical.length) {
      refMonitorCenter()?.upstreamServerDataStatistical.forEach((v, i) => {
        speedArray[i] = '↑' + speed2String(v.up.speed) + ' ↓' + speed2String(v.down.speed);
        dataArray[i] = '↑' + dataCount2String(v.up.count) + ' ↓' + dataCount2String(v.down.count);
      });
    }

    const outData = render(`
<html lang="zh">
<header>
    <meta charset="UTF-8"/>
    <style type="text/css">
        th {
            border: black 0 dashed;
            border-left-width: 1px;
            border-bottom: lightslategrey 1px solid;
        }

        td {
            border: lightslategrey 1px solid;
            border-right-width: 0;
            border-top-width: 0;
        }

        tr:hover {
            background-color: lightblue;
        }

        tfoot > tr:hover {
            background-color: inherit;
        }
    </style>
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
<table style="border: black 3px dashed;">
    <thead>
    <tr>
        <th style="border-left-width: 0;">No.</th>
        <th>Host:Port</th>
        <th>online</th>
        <th>connectable</th>
        <th>running</th>
        <th>lastTCPCheckTime</th>
        <th>lastConnectCheckTime</th>
        <th>ManualDisable</th>
        <th>Close Connect</th>
        <th>Select</th>
        <th>data</th>
        <th>speed</th>
        <!--        <th></th>-->
    </tr>
    </thead>
    <tbody>
    <% upstreamPool.forEach(function(u, i){ %>
        <tr>
            <td style="border-left-width: 0;"><%= i + 1 %>.</td>
            <td><%= u.host %>:<%= u.port %></td>
            <td>
                <% if(!u.isOffline){ %>
                    <span style="color: green">True</span>
                <% } else { %>
                    <span style="color: red">False</span>
                <% } %>
            </td>
            <td>
                <% if(!u.lastConnectFailed){ %>
                    <span style="color: green">True</span>
                <% } else { %>
                    <span style="color: red">False</span>
                <% } %>
            </td>
            <td><%= u.connectCount %></td>
            <td><%= formatTime(u.lastOnlineTime) %></td>
            <td><%= formatTime(u.lastConnectTime) %></td>
            <td>
                <% if(u.isManualDisable){ %>
                    <span style="color: red">Disabled</span>
                    <a href="/op?enable=<%= i %>">Enable It</a>
                <% } else { %>
                    <span style="color: green">Enabled</span>
                    <a href="/op?disable=<%= i %>">Disable It</a>
                <% } %>
            </td>
            <td>
                <a href="/op?endConnectOnServer=<%= i %>">Close Connect</a>
            </td>
            <td>
                <a href="/op?forceNowUseServer=<%= i %>">Use This Now</a>
            </td>
            <td><%= dataArray[i] %></td>
            <td><%= speedArray[i] %></td>
            <!--            <td></td>-->
        </tr>
    <% }); %>
    </tbody>
    <tfoot>
    <tr>
        <td colspan="12">
            &emsp;<a href="/op?cleanAllCheckState=1">Clean Check State</a>
            &emsp;<a href="/op?endAllConnect=1">Force Close All Connect</a>
            &emsp;<a href="/op?forceCheckAllServer=1">Force Check All Now</a>
        </td>
    </tr>
    </tfoot>
</table>
---------------------------------------------------------------------------------------------
<br/>
lastConnectServer:
<% if(monitorCenter.lastConnectServer){ %>
    <%= monitorCenter.lastConnectServer.host + ':' + monitorCenter.lastConnectServer.port %>
<% } else { %>
    Undefined
<% } %>
<br/>
lastUseUpstreamIndex: <%= lastUseUpstreamIndex+1 %>
<br/>
<br/>
now time: <%= nowTime %>
<br/>
runTime: <%= runTimeString %>
<br/>
runTime: <%= runTimeString2 %>
<br/>
listen On: <%= listenOn %>
<br/>
---------------------------------------------------------------------------------------------
<br/>
<h5>Fast Issue Resolve</h5>
<ul>
    <li>Web page Open very Sloooow :&emsp;<a href="/op?endAllConnect=1">Force Close All Connect</a></li>
    <li>Seems like Server State not update :&emsp;<a href="/op?forceCheckAllServer=1">Force Check All Now</a></li>
    <li>I Want To Disable All Server :&emsp;<a href="/op?disableAllServer=1">Disable All Server</a></li>
    <li>I Want To Enable All Server :&emsp;<a href="/op?enableAllServer=1">Enable All Server</a></li>
</ul>
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
      listenOn: getListenInfo().listenHost + ':' + getListenInfo().listenPort,
      lastUseUpstreamIndex: getLastUseUpstreamIndex(),
      speedArray: speedArray,
      dataArray: dataArray,
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
    if (isString(req.query.forceNowUseServer)) {
      const n = parseInt(req.query.forceNowUseServer, 10);
      if (n >= 0 && n < upstreamPool.length) {
        forceSetLastUseUpstreamIndex(n);
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.cleanAllCheckState)) {
      const n = parseInt(req.query.cleanAllCheckState, 10);
      if (n === 1) {
        cleanAllCheckState();
        forceCheckNow();
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.endAllConnect)) {
      const n = parseInt(req.query.endAllConnect, 10);
      if (n === 1) {
        upstreamPool.forEach(v => endAllConnectOnUpstream(v));
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.forceCheckAllServer)) {
      const n = parseInt(req.query.forceCheckAllServer, 10);
      if (n === 1) {
        forceCheckNow();
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.disableAllServer)) {
      const n = parseInt(req.query.disableAllServer, 10);
      if (n === 1) {
        upstreamPool.forEach(v => v.isManualDisable = true);
        res.statusMessage = 'OK';
      }
    }
    if (isString(req.query.enableAllServer)) {
      const n = parseInt(req.query.enableAllServer, 10);
      if (n === 1) {
        upstreamPool.forEach(v => v.isManualDisable = false);
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

function formatNumber2FixedLength(n: number) {
  return n.toFixed(3);
}
