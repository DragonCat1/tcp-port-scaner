# TCP-PORT-SCANER

A Multi Thread TCP Port Scaner

## Install

```bash
npm i tcp-port-scaner -g
```

## Usage

### CLI

#### 1. Single target

```bash
portscan --target 127.0.0.1 --ports 80
```

#### 2. Multi target

```bash
portscan --target 192.168.1.1 192.168.1.2 --ports 80
```

#### 3. IP Range target

```bash
portscan --target 192.168.1.1-192.168.1.254 --ports 80
```

#### 4. CIDR Range target

```bash
portscan --target 192.168.1.1/24 --ports 80
```

#### 5. Target from iplist file

```bash
portscan -f iplist.list --ports 80
```

#### 6. Multi Ports

```bash
portscan --target 127.0.0.1 --ports 80 81 2000-3000
```

#### For More Options

```bash
portscan -h
```

### Programme

```javascript
const Scaner = require('tcp-port-scaner')

const scaner = new Scaner()

scaner.init({
  targets: ['192.168.1.1/24', '192.168.2.1-192.168.2.254'],
  ports: [80, 81, '1000-2000'],
  thread: 100,
  timeout: 5000,
  callback({ host, port, open }) {
    if (open) {
      console.log(`${host}:${port} is open`)
    }
  },
})

scaner.run()
```
