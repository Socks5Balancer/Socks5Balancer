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

import {testSocks5} from './BackendTester';
import {globalConfig} from './configLoader';
import {Subscription, timer} from 'rxjs';
import moment from 'moment';
import {assign} from 'lodash'

testSocks5();

interface UpstreamInfo {
  host: string;
  port: number;
  lastOnline: moment.Moment;
  lastConnectAble: moment.Moment;
}

const defaultUpstreamInfo: Omit<UpstreamInfo, 'host' | 'port'> = {
  lastOnline: moment(),
  lastConnectAble: moment(),
};

// The servers we will proxy to
let upstreamServerAddresses: UpstreamInfo[] = [];

export function initUpstreamPool() {
  upstreamServerAddresses = globalConfig.get('upstream', upstreamServerAddresses);
  upstreamServerAddresses = upstreamServerAddresses.filter(v => v.host && v.port)
    .map(v => assign(v, defaultUpstreamInfo));
  if (upstreamServerAddresses.length === 0) {
    console.error('initUpstreamPool (upstreamServerAddresses.length === 0)');
    throw new Error('initUpstreamPool (upstreamServerAddresses.length === 0)');
  }
}

// This is where you pick which server to proxy to
// for examples sake, I choose a random one
export function getServerBasedOnAddress(host: string | undefined) {
  return upstreamServerAddresses[Math.floor((Math.random() * 3))]
}

let socks5CheckTimer: Subscription | undefined = undefined;
let connectCheckTimer: Subscription | undefined = undefined;

export function startCheckTimer() {
  if (socks5CheckTimer) {
    socks5CheckTimer.unsubscribe();
    socks5CheckTimer = undefined;
  }
  if (connectCheckTimer) {
    connectCheckTimer.unsubscribe();
    connectCheckTimer = undefined;
  }
  socks5CheckTimer = timer(100, 5 * 1000).subscribe(value => {

  });
  connectCheckTimer = timer(100, 5 * 60 * 1000).subscribe(value => {

  });
}
