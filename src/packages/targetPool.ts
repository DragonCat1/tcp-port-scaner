import ip from 'ip'
import { portVerify } from './tools'

type TOptions = {
  targets:string[]
  ports:string[],
  thread:number
}

enum HostType  {
  single=1,
  range,
  subnet,
  host
}

interface IOptionTarget  {
  type:HostType
  host?:string,
  form?:string,
  to?:string,
  count:number
}


type TTarget = {
  host:string,
  port:number
}


export default class TargetPool {
  constructor(options:TOptions){
    // handle ports parameter
    options.ports.forEach(port=>{
      if(port.match(/\d+-\d+/)){
        const [portStart,portEnd] = port.split('-').map(str => {
          return Number(str)
        })
        const portVerifyResult = [portVerify(portStart),portVerify(portEnd)]
        if(portVerifyResult.some(el=>!el.success)){
          throw new Error(portVerifyResult.find(el=>!el.success)?.message)
        }
        if(portStart > portEnd){
          throw new Error(`Port range not correct, received ${port}`);
        }
        this.ports.push(...new Array(portEnd-portStart+1).fill(undefined).map((el,index)=>portStart + index))
      } else if(port.match(/\d+/)) {
        const portVerifyResult = portVerify(port)
        if(!portVerifyResult.success){
          throw new Error(portVerifyResult.message);
        }
        this.ports.push(Number(port))
      } else{
        throw new Error(`Port parameter not correct, received ${port}`)
      }
    })
    this.thread = options.thread
    this.targets = options.targets.map(el=>{
      const target:IOptionTarget = {
        type:HostType.single,
        count:0
      }
      if(el.match(/^\d+\.\d+\.\d+\.\d+$/)){
        target.type = HostType.single
        target.form = el
        target.to = el
        target.count = 1
      }
      else if(el.match(/^\d+\.\d+\.\d+\.\d+-\d+\.\d+\.\d+\.\d+$/)){
        const [from,to] = el.split('-')
        target.type = HostType.range
        target.form = from
        target.to = to
        target.count = ip.toLong(to) - ip.toLong(from) + 1
      }
      else if(el.match(/^\d+\.\d+\.\d+\.\d+\/\d{1,2}$/)){
        target.type = HostType.subnet
        const subnetInfo = ip.cidrSubnet(el)
        target.form = subnetInfo.firstAddress
        target.to = subnetInfo.lastAddress
        target.count = subnetInfo.numHosts
      }else{
        target.type = HostType.host
        target.host = el
        target.count = 1
      }
      return target
    })
    this.total = this.targets.reduce((a,b)=>{
      return a+b.count
    },0)*this.ports.length
    this.pages = Math.ceil(this.total / this.thread)
  }

  /**
   * 端口列表
   */
  public ports:number[] = []
  /**
   * 线程/每页条数
   */
  public thread=5
  /**
   * 目标
   */
  public targets:IOptionTarget[]
  /**
   * 总数
   */
  public total:number
  /**
   * 页面数
   */
  public pages:number
  /**
   * 当前页面
   */
  public curPage=0

  /**
   * 当前索引
   */
  public curIndex=-1
  /**
   * 当前目标组索引
   */
  public curTargetsIndex=-1

  /**
   * 当前目标组内目标索引
   */
  public curTargetInTargetsIndex=-1

  /**
   * 当前端口列表索引
   */
  public curPortIndex=-1


  get isEnd():boolean{
    return this.curPage >= this.pages
  }

  get progress():string{
    return `${this.curPage}/${this.pages}`
  }

  public getPage(page=1):TTarget[]{
    if(page<1 || page>this.pages){
      return []
    }
    this.curPage = page
    const startIndex = (page-1) * this.thread // 该页在所有目标ip端口组合列表中的开始索引
    const endIndex = page * this.thread - 1 // 该页在所有目标ip端口组合列表中的结束索引
    // console.log({startIndex,endIndex})
    const portsLength = this.ports.length
    const result:TTarget[] = []
    let index = 0
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i]
      const targetStartIndex = index // ip分组的开始索引
      const targetEndIndex = index + target.count * portsLength - 1 // ip分组的结束索引
      index = targetEndIndex+1 //累加索引用于计算下一分组的开始和结束索引
      // console.log({targetStartIndex,targetEndIndex})
      let rangeStart = -1,rangeEnd = -1
      if(startIndex>=targetStartIndex && startIndex <= targetEndIndex){
        rangeStart = startIndex
      }
      else if(startIndex<targetStartIndex && endIndex>=targetStartIndex){
        rangeStart = targetStartIndex
      }
      if(endIndex >= targetStartIndex && endIndex <= targetEndIndex){
        rangeEnd = endIndex
      }
      else if(endIndex>targetEndIndex && startIndex<=targetEndIndex){
        rangeEnd = targetEndIndex
      }
      // console.log({rangeStart,rangeEnd})
      if(rangeStart>-1&&rangeEnd>-1){
        this.curTargetsIndex = i
        const start = rangeStart - targetStartIndex
        const end = rangeEnd- targetStartIndex
        // console.log({start,end})
        const fromLong = target.form ? ip.toLong(target.form) : NaN
        for(let j = start;j<=end;j++){
          this.curPortIndex = j % portsLength
          this.curTargetInTargetsIndex = Math.floor(j/portsLength)
          const port = this.ports[this.curPortIndex]
          const host = target.host ? target.host : ip.fromLong(fromLong + this.curTargetInTargetsIndex)
          result.push({
            host,
            port
          })
        }
      }
      if(result.length>=this.thread){
        break
      }
    }
    this.curIndex += result.length
    return result
  }

  public nextPage():TTarget[]{
    const result = this.getPage(this.curPage===this.pages ? 1 : this.curPage+1)
    return result
  }

  public setPage(page:number):void{
    if(page<1 || page>this.pages){
      return
    }
    this.curPage = page
  }

  public setIndex(i:number):void {
    if(i<0 || i>=this.total){
      return
    }
    const portsLength = this.ports.length
    this.curIndex = i
    let index = 0
    for (let targetsIndex = 0; targetsIndex < this.targets.length; targetsIndex++) {
      if(i>=index && i<this.targets[targetsIndex].count * portsLength + index){
        this.curTargetsIndex = targetsIndex
        this.curTargetInTargetsIndex=Math.floor((i-index) / portsLength)
        this.curPortIndex = (i-index) % portsLength
        break
      }
      index = index + this.targets[targetsIndex].count*portsLength
    }
  }

  public nextOne():TTarget{
    this.curTargetsIndex = this.curTargetsIndex===-1?0:this.curTargetsIndex
    this.curTargetInTargetsIndex = this.curTargetInTargetsIndex===-1?0:this.curTargetInTargetsIndex
    if(this.curIndex+1>=this.total){
      this.curIndex = 0
      this.curTargetsIndex=0
      this.curTargetInTargetsIndex=0
      this.curPortIndex=0
    }
    else if(this.curPortIndex+1 < this.ports.length){
      this.curPortIndex++
      this.curIndex++
    }
    else if(this.curTargetInTargetsIndex+1<this.targets[this.curTargetsIndex].count){
      this.curTargetInTargetsIndex++
      this.curPortIndex=0
      this.curIndex++
    }
    else if(this.curTargetsIndex+1<this.targets.length){
      this.curTargetsIndex++
      this.curTargetInTargetsIndex=0
      this.curPortIndex=0
      this.curIndex++
    }
    const target = this.targets[this.curTargetsIndex]
    const fromLong = target.form ? ip.toLong(target.form) : NaN
    return {
      host:target.host?target.host:ip.fromLong(fromLong + this.curTargetInTargetsIndex),
      port:this.ports[this.curPortIndex]
    }
  }
}
