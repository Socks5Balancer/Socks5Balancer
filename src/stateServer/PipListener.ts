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

import {Transform} from 'stream';
import moment from 'moment';
import {bufferTime, map, filter} from 'rxjs/operators';
import {Observable, Subject} from 'rxjs';
import {isNumber, isNil, isBoolean, isArray, isFunction} from 'lodash';

export interface PipListenerObservData {
  speed: number;
  nowSpeed: number;
  countDiff: number;
  count: number;
  averageSpeed: number;
}

export interface PipListenerConfig {
  bufferTimeInterval?: number;
  speedSmoothRate?: number;
  dontSendProgressDuringNoData?: boolean;
  dontBufferByTime?: boolean;
  isObjectMode?: boolean;
  chunkSizeCounter?: ((chunk: any) => number);
}

// tslint:disable:no-inferrable-types

export class PipListener extends Transform {
  protected count = 0;
  protected lastCheck = 0;
  protected lastSpeed = 0;
  protected lastSpeedSmoothRate = 0.5;
  protected bufferTimeInterval = 500;
  protected startTime: moment.Moment | undefined = undefined;
  protected endTime: moment.Moment | undefined = undefined;
  protected dontSendProgressDuringNoData: boolean = false;
  protected dontBufferByTime: boolean = false;

  constructor(beginOffset?: number, config?: PipListenerConfig) {
    super({
      readableObjectMode: (config && !!config.isObjectMode) || false,
      writableObjectMode: (config && !!config.isObjectMode) || false,
    });
    this.count = beginOffset || 0;
    config = config || {};
    if (isBoolean(config.dontSendProgressDuringNoData)) {
      this.dontSendProgressDuringNoData = config.dontSendProgressDuringNoData;
    }
    if (isBoolean(config.dontBufferByTime)) {
      this.dontBufferByTime = config.dontBufferByTime;
    }
    if (isNumber(config.bufferTimeInterval) && config.bufferTimeInterval > 0) {
      this.bufferTimeInterval = config.bufferTimeInterval;
    }
    if (isNumber(config.speedSmoothRate) && config.speedSmoothRate >= 0 && config.speedSmoothRate < 1) {
      this.lastSpeedSmoothRate = config.speedSmoothRate;
    } else if (isNumber(config.speedSmoothRate)) {
      console.warn('PipListener speedSmoothRate must >=0 and <1. but now it\'s' + config.speedSmoothRate);
    }
    if (isFunction(config.chunkSizeCounter)) {
      this.chunkSizeCounter = config.chunkSizeCounter;
    } else if (!!config.isObjectMode) {
      console.warn('PipListener chunkSizeCounter must isFunction when isObjectMode are true.');
    }
    this.once('error', err => this.subject.error(err));
    this.once('end', () => {
      this.endTime = moment();
      this.subject.complete();
    });

    let observable: Observable<number | number[]> = this.subject.asObservable();
    if (config.dontBufferByTime) {
      observable = (observable as Observable<number>).pipe(
        map(T => [T]),
      ) as Observable<number[]>;
    } else {
      observable = (observable as Observable<number>).pipe(
        bufferTime(this.bufferTimeInterval),
      ) as Observable<number[]>;
    }
    if (this.dontSendProgressDuringNoData) {
      observable = (observable as Observable<number[]>).pipe(
        filter((A: number[]) => {
          if (this.dontSendProgressDuringNoData) {
            return A.length > 0;
          }
          return true;
        }),
      ) as Observable<number[]>;
    }
    this.observable = (observable as Observable<number[]>).pipe(
      map((A: number[]): PipListenerObservData => {
        if (A.length > 0) {
          const thisCheck = A[A.length - 1];
          const lastCheck = this.lastCheck;
          this.lastCheck = thisCheck;

          const speed = (thisCheck - lastCheck) * (1000 / this.bufferTimeInterval);
          this.lastSpeed = (this.lastSpeed * this.lastSpeedSmoothRate)
            + (speed * (1 - this.lastSpeedSmoothRate));
          const averageSpeed = this.count / moment().diff(moment(this.startTime)) * 1000.0;
          return {
            // lastCheck: lastCheck,
            // thisCheck: thisCheck,
            countDiff: thisCheck - lastCheck,
            count: this.count,
            speed: this.lastSpeed,
            nowSpeed: speed,
            averageSpeed: averageSpeed,
          };
        } else {
          return this.getLastState();
        }
      }),
    );
  }

  protected subject = new Subject<number>();
  protected observable: Observable<PipListenerObservData>;
  protected chunkSizeCounter: ((chunk: any) => number) = (chunk: any) => {
    return (chunk as ArrayBuffer).byteLength;
  };

  public getLastState(): PipListenerObservData {
    const thisCheck = this.lastCheck;
    const speed = 0;
    this.lastSpeed = (this.lastSpeed * this.lastSpeedSmoothRate)
      + (speed * (1 - this.lastSpeedSmoothRate));
    let averageSpeed = this.count / moment().diff(moment(this.startTime)) * 1000.0;
    if (this.endTime) {
      averageSpeed = this.count / this.endTime.diff(moment(this.startTime)) * 1000.0;
    }
    return {
      countDiff: 0,
      count: this.count,
      speed: this.lastSpeed,
      nowSpeed: speed,
      averageSpeed: averageSpeed,
    };
  }

  public asObservable() {
    return this.observable;
  }

  _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
    if (isNil(this.startTime)) {
      this.startTime = moment();
    }
    this.push(chunk);
    this.count += this.chunkSizeCounter(chunk);
    // console.log({count: this.count, max: this.max});
    // console.log(this.count / this.max * 100, '%', this.count, this.max);
    this.subject.next(this.count);
    callback();
  }

  _flush(callback: (error?: (Error | null), data?: any) => void): void {
    callback();
  }
}

