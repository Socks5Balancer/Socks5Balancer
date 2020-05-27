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

import fs from 'fs';
import {promisify} from 'util';
import {has, get, isNil, isString} from 'lodash';

export class ConfigLoader {
  data?: { [key: string]: any };

  constructor(public configPath: string | undefined) {
  }

  initSync() {
    if (this.configPath) {
      try {
        const d = fs.readFileSync(this.configPath, {encoding: 'utf8'});
        this.data = JSON.parse(d);
        console.log(this.data);
        return true;
      } catch (e) {
        console.error('ConfigLoader initSync error', e);
        return false;
      }
    } else {
      console.warn('ConfigLoader initSync configPath is undefined.');
      return false;
    }
  }

  async init() {
    try {
      if (this.configPath) {
        const state = await (promisify(fs.stat))(this.configPath);
        if (!state.isFile()) {
          return false;
        }
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
    const d = await (promisify(fs.readFile))(this.configPath, {encoding: 'utf8'});
    this.data = JSON.parse(d);
    return true;
  }

  get<dvT = any>(path: string, dv?: dvT): any | undefined | dvT;
  get(path: string, dv?: any): any | undefined {
    // console.log('ConfigLoader get ', [path, dv], get(this.data, path, dv));
    return get(this.data, path, dv);
  }

  has(path: string): boolean {
    return has(this.data, path);
  }

}

const globalConfigFilePath: string | undefined = (process.env.globalConfigFilePath || undefined);

export const globalConfig = (() => {
  const c = new ConfigLoader(globalConfigFilePath);
  c.initSync();
  return c;
})();
