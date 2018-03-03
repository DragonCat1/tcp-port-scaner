#!/usr/bin/env node

import {getOptions} from './packages/commander'
import PortScaner from './index'
import fs from 'fs'
import os from 'os'



async function main(){
  const cliArgs = await getOptions()
  const portScaner = new PortScaner()
  await portScaner.init({
    ports:cliArgs.ports,
    ipsFile:cliArgs.file,
    targets:cliArgs.target,
    thread:Number(cliArgs.thread),
    timeout:Number(cliArgs.timeout),
    callback(result){
      if(result.open){
        fs.appendFileSync('result.txt',`${result.host}:${result.port}${os.EOL}`)
      }
    }
  })

  const mode = Number(cliArgs.mode)
  await portScaner.run(mode)
  if(mode === 1){
    process.exit()
  }
}

main()
