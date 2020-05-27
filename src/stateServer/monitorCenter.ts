export class MonitorCenter {
  connectCount: number = 0;
}

let monitorCenter = new MonitorCenter();

export function refMonitorCenter() {
  return monitorCenter;
}
