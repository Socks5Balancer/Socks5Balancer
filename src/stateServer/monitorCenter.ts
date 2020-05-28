import {UpstreamInfo} from '../upstreamPool';
import moment from 'moment';

export class MonitorCenter {
  // tslint:disable-next-line:no-inferrable-types
  connectCount: number = 0;
  startTime: moment.Moment = moment();
  lastConnectServer: UpstreamInfo | undefined;
}

let monitorCenter = new MonitorCenter();

export function refMonitorCenter() {
  return monitorCenter;
}
