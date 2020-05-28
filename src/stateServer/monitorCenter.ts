import {UpstreamInfo} from '../upstreamPool';

export class MonitorCenter {
  connectCount: number = 0;
  lastConnectServer: UpstreamInfo | undefined;
}

let monitorCenter = new MonitorCenter();

export function refMonitorCenter() {
  return monitorCenter;
}
