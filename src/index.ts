import scan,{Result} from './packages/scan'
import TargetPool from './packages/targetPool'
import fs from 'fs'
import readline from 'readline'

type Callback = (result:Result)=>void
export interface IPortScanerArgs{
  targets?:string[]
  ports:string[],
  thread?:number,
  ipsFile?:string,
  timeout?:number
  callback?:Callback
}

export default class PortScaner {
  private targetPool?:TargetPool
  private callback?: Callback
  private timeout = 2000

  private onEnd(target:Result){
    this.callback && this.callback(target)
  }

  public async init(args:IPortScanerArgs):Promise<void> {
    if(!args.targets&&!args.ipsFile){
      console.log('no targets')
      return
    }
    if(args.timeout){
      this.timeout = args.timeout
    }
    const targets:string[] = []
    if(args.targets){
      targets.push(...args.targets)
    }
    if(args.ipsFile){
      const fileStream = fs.createReadStream(args.ipsFile)
      const rl = readline.createInterface({
        input:fileStream,
        crlfDelay: Infinity
      })
      for await (const line of rl) {
        targets.push(line)
      }
    }
    this.callback = args.callback
    this.targetPool = new TargetPool({
      ports:args.ports,
      targets,
      thread:args.thread || 5
    })
    console.log({
      total:this.targetPool.total,
      ports:this.targetPool.ports,
      thread:this.targetPool.thread
    })
  }

  run(mode=1):Promise<void>{
    console.log({
      mode
    })
    if(mode===1){
      return this.runPageMode()
    }
    else{
      return this.runAloneMode()
    }
  }

  public async runPageMode():Promise<void>{
    if(!this.targetPool){
      throw new Error('not init')
    }
    while (!this.targetPool.isEnd) {
      await Promise.all(
        this.targetPool.nextPage().map(target=>{
          return scan(target.host,target.port,{
            timeout:this.timeout
          }).then(target=>{
            this.onEnd(target)
            if(target.open){
              console.log(`${target.host}:${target.port} open`)
            }
          })
        })
      )
      console.log(`progress:${this.targetPool.progress}`)
    }
    console.log('done!')
  }


  runAloneMode():Promise<void>{
    if(!this.targetPool){
      throw new Error('not init')
    }

    setInterval(() => {
      if(this.targetPool){
        console.log(`progress:${this.targetPool.curIndex+1}/${this.targetPool.total}`)
      }
    }, 3000);
    const scanNext = ()=>{
      if(!this.targetPool){
        return
      }
      const target = this.targetPool.nextOne()
      scan(target.host,target.port,{
        timeout:this.timeout
      }).then(target=>{
        this.onEnd(target)
        if(target.open){
          console.log(`${target.host}:${target.port} open`)
        }
        scanNext()
      })
    }
    for(let i=0;i<this.targetPool.thread;i++){
      scanNext()
    }
    return Promise.resolve()
  }

  /**
   * for pageMode
   */
  public setPage(page:number):void{
    if(!this.targetPool){
      throw new Error('not init')
    }
    this.targetPool.setPage(page)
  }

  /**
   * for aloneMode
   */
  public setIndex(i:number):void{
    if(!this.targetPool){
      throw new Error('not init')
    }
    this.targetPool.setIndex(i)
  }
}
