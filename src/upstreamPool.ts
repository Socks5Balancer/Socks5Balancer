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

testSocks5();

// The servers we will proxy to
const upstreamServerAddresses: { host: string, port: number }[] = globalConfig.get('upstream', [
  {host: '127.0.0.1', port: 3000},
  {host: '127.0.0.1', port: 3001},
  {host: '127.0.0.1', port: 3002},
]);

// This is where you pick which server to proxy to
// for examples sake, I choose a random one
export function getServerBasedOnAddress(host: string | undefined) {
  return upstreamServerAddresses[Math.floor((Math.random() * 3))]
}

