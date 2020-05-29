import {getUpstreamServerAddresses, UpstreamInfo} from '../upstreamPool';
import moment from 'moment';
import {Observable, timer} from 'rxjs';
import {globalConfig} from '../configLoader';

export class ServerDataStatistical {
  // tslint:disable:no-inferrable-types
  count: number = 0;
  lastCheckCount: number = 0;
  speed: number = 0;

  // tslint:enable:no-inferrable-types

  constructor() {
  }

  /**
   * @param period  ms
   */
  check(period: number) {
    const s = this.count - this.lastCheckCount;
    period = period > 0 ? period : 0;
    this.speed = s * 1000 / period;
  }
}

export class MonitorCenter {
  // tslint:disable-next-line:no-inferrable-types
  connectCount: number = 0;
  startTime: moment.Moment = moment();
  lastConnectServer: UpstreamInfo | undefined;
  upstreamServerDataStatistical: ServerDataStatistical[] = [];
  statisticalTimer: Observable<number> | undefined;
}

let monitorCenter: MonitorCenter | undefined = undefined;

export function refMonitorCenter() {
  if (!monitorCenter) {
    monitorCenter = new MonitorCenter();
    monitorCenter.upstreamServerDataStatistical = getUpstreamServerAddresses().map(() => new ServerDataStatistical());
    const statisticalTimerPeriod = globalConfig.get('internalBehavior.statisticalTimerPeriod', 1000);
    monitorCenter.statisticalTimer = timer(1000, statisticalTimerPeriod);
    monitorCenter.statisticalTimer.subscribe(() => {
      monitorCenter?.upstreamServerDataStatistical.forEach(v => v.check(statisticalTimerPeriod));
    });
  }
  return monitorCenter;
}
