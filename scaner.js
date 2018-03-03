const Ip = require('ip')
const Net = require('net')
const sLog = require('single-line-log').stdout
const conf = require('./config')
let {
  portFrom,
  portTo,
  ipworkers,
  poworkers,
  connectTimeout,
  match,
  ips
} = conf
let matchedIps = []
ips.forEach(element => {
  if (element[1].match(new RegExp(match, 'i'))) {
    matchedIps.push(element[0])
  }
})
let ipsIndex = 0
let subnet = Ip.cidrSubnet(matchedIps[ipsIndex])
let ipStart = subnet.firstAddress
let ipEnd = subnet.lastAddress
let curIpLong = Ip.toLong(ipStart)
let endIpLong = Ip.toLong(ipEnd)
let totalTimes = (endIpLong - curIpLong + 1) * (portTo - portFrom + 1)
let cur = 0
let [printInterval, nextTimeout] = [null, null]
let printStr = ''
let total = 0
let ipWorker = () => {
  let ip = curIpLong
  if (ip <= endIpLong) {
    curIpLong++
    ip = Ip.fromLong(ip)
    let port = portFrom
    portWorker(ip, port)
  } else {
    if (!nextTimeout) {
      nextTimeout = setTimeout(() => {
        clearInterval(printInterval)
        if (ipsIndex < matchedIps.length - 1) {
          printStr += `Progress.${ipsIndex} ${cur}/${totalTimes} ${Math.round(cur / totalTimes * 10000) / 100}% ${Ip.fromLong(curIpLong)}`
          ipsIndex++
          subnet = Ip.cidrSubnet(matchedIps[ipsIndex])
          ipStart = subnet.firstAddress
          ipEnd = subnet.lastAddress
          curIpLong = Ip.toLong(ipStart)
          endIpLong = Ip.toLong(ipEnd)
          totalTimes = (endIpLong - curIpLong + 1) * (portTo - portFrom + 1)
          cur = 0
          main(callback)
          clearTimeout(nextTimeout)
          nextTimeout = null
        } else {
          return new Promise((resolve, reject) => {
            printStr += '\r\n完成'
            sLog(printStr)
            resolve()
          })
        }
      }, 10000)
    }
  }
}
let portWorker = (ip, port) => {
  let scan = () => {
    let p = port
    if (port <= portTo) {
      port++
      let isFinish = false
      let socket = Net.connect(p, ip, () => {
        isFinish = true
        cur++
        total++
        // console.log(`${ip}:${p} Port Open`)
        callback(ip, p)
        socket.destroy()
        socket = null
        if (port <= portTo) {
          scan(ip, port)
        } else ipWorker()
      })
      socket.on('error', (e) => {
        isFinish = true
        cur++
        total++
        socket.destroy()
        socket = null
        if (port <= portTo) {
          scan(ip, port)
        } else ipWorker()
      })
      setTimeout(() => {
        if (!isFinish) {
          cur++
          total++
          socket.destroy()
          socket = null
          if (port <= portTo) {
            scan(ip, port)
          } else ipWorker()
        }
      }, connectTimeout)
    }
  }
  for (let i = 0; i < poworkers; i++) {
    scan()
  }
}
let callback = () => {}
let main = function () {
  if (arguments.length === 3) {
    portFrom = arguments[0] || portFrom
    portTo = arguments[1] || portTo
    callback = arguments[2] || callback
  } else if (arguments.length === 2) {
    portFrom = arguments[0] || portFrom
    portTo = arguments[0] || portTo
    callback = arguments[1] || callback
  } else {
    callback = arguments[0] || callback
  }
  for (let i = 0; i < ipworkers; i++) {
    ipWorker()
  }
  printInterval = setInterval(() => {
    sLog(`${printStr}\r\nProgress.${ipsIndex} ${cur}/${totalTimes}/${total} ${Math.round(cur / totalTimes * 10000) / 100}% ${Ip.fromLong(curIpLong)}`)
  }, 200)
}
module.exports = main
