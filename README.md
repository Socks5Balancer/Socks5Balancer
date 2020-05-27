# Socks5Balancer
A Simple TCP Socket Balancer for balance Multi Socks5 Proxy Backend

---

## Features
1. Load Balance user connect to multi backend with multi rule
1. Load all config from config file
1. support unlimited backend number
1. can monitor backend alive state
1. can monitor backend is work well
1. connection from front end will not connect to dead backend
1. have 2 check way to check a backend is dead or alive
1. if a backend revive from dead, it will be auto enable

## the Rule of Load Balance now support
1. `loop` \: every connect will round robin on all live backend
1. `random` \: every connect will random connect a live backend
1. `one_by_one` \: every new connect will try to use last connect backend, if that backend dead, will try next live one
1. `change_by_time` \: similar `one_by_one` , but will force change server to next after a specific time (in config)

## config
config is a json, the template config is `config.json`
it must encode with `UTF-8 no BOM`
```json5
{
  "listenHost": "127.0.0.1",                // the listen host, default is 127.0.0.1
  "listenPort": 5000,                       // the listen port, default is 5000
  // (if all backend down at same time, the new connect will wast `retryTimes*connectTimeout` time on it. )
  "retryTimes": 3,                          // when new connect coming, how many backend we try to connect. default is 3
  "connectTimeout": 2000,                   // when try to connect backend, how long the backend connect timeout means it's dead. default is 2000ms (2s)
  // (notice that, the testRemoteHost must be a HTTPS server. now we only check is it connectable.)
  "testRemoteHost": "www.google.com",       // what target host name we use to check the backend socks5 proxy work well. default is "www.google.com"
  "testRemotePort": 443,                    // what target port we use to check the backend socks5 proxy work well. default is 443
  // (the `tcpCheck` only create a TCP handshake to backend to check the backend is alive)
  "tcpCheckPeriod": 5000,                   // how many Period of every backend live check. default is 5000ms (5s)
  "tcpCheckStart": 1000,                    // how many time we wait before first backend live check. default is 1000ms (1s)
  "connectCheckPeriod": 300000,             // how many Period of check every backend socks5 proxy work well. default is 300000ms (300s or 5min)
  "connectCheckStart": 15000,               // how many time we wait before first check backend socks5 proxy work well. default is 15000ms (15s)
  "upstreamSelectRule": "random",           // the Load Balance Rule. default is `random`
  "sleepTime": 1800000,                     // how many time we need to sleep after last connect. default is 1800000ms (1800s or 30min)
  "serverChangeTime": 5000,                 // the config of Load Balance Rule `change_by_time`. default is 5000ms (5s)
  "upstream": [                             // the backend server array.  default is empty. (now only support socks5 proxy server)
    {
      "host": "127.0.0.1",                  // the backend server host
      "port": 3000                          // the backend server port
    },
    {
      "host": "127.0.0.1",
      "port": 3001
    },
    {
      "host": "127.0.0.1",
      "port": 3002
    }
  ]
}
```

the minimal config template :

```json
{
  "listenHost": "127.0.0.1",
  "listenPort": 5000,
  "upstreamSelectRule": "random",
  "serverChangeTime": 5000,
  "upstream": [
    {
      "host": "127.0.0.1",
      "port": 3000
    }
  ]
}

```

---

## Notice

if a backend cannot connect to the `testRemoteHost`, this backend cannot pass the `connectCheck`.

if a backend cannot be handshake use TCP, this backend cannot pass the `tcpCheck`.

if a backend  cannot pass `connectCheck` or `tcpCheck`, this backend will be disable untill it pass all the two check.

if all backend are disabled, the front connect will be reject.

**Warning: the `connectCheck` have a long CheckPeriod (default is 5min), if it cannot work well in the Period, connect to it will han and the Balance unable to discover it.**

**Warning: Many socks5 Proxy have a strange behavior, the first connect will hang or wait many time after a lone idle.**

**Warning: if you set the `connectCheckPeriod` too short, it may wast many bandwidth.**




---

## TODO
- [ ] support socks5 UDP
- [ ] support Load Balance Rule `best_latency`
- [ ] support Load Balance Rule `fast_download_speed`
- [ ] support Load Balance Rule `fast_upload_speed`
