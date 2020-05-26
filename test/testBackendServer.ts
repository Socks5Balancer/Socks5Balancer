// Create the test upstream servers
import net from 'net';

// The servers we will proxy to
const upstreamServerAddresses: { host: string, port: number }[] = [
  {host: '127.0.0.1', port: 3000},
  {host: '127.0.0.1', port: 3001},
  {host: '127.0.0.1', port: 3002},
];

// tslint:disable-next-line:prefer-for-of
for (let i = 0; i < upstreamServerAddresses.length; i++) {
  const upstream = upstreamServerAddresses[i];

  net.createServer((socket) => {
    socket.on('data', (data) => {
      console.log('Received some data on ' + upstream.host + ':' + upstream.port);
      console.log(data);
    });
  }).listen(upstream.port);
}
