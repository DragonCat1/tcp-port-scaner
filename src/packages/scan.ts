import net from 'net'

type Options = {
  timeout:number
}

export type Result = {
  host:string,
  port:number,
  open:boolean
}

async function scan(host:string,port:number,options:Options = {timeout:2000}):Promise<Result>{
  return new Promise((resolve)=>{
    const socket = new net.Socket()
    socket.setTimeout(options.timeout)
    const handleError = ()=>{
      socket.destroy()
      resolve({
        host,
        port,
        open:false
      })
    }
    socket.on('error',handleError).on('timeout',handleError)
    socket.connect({host,port},()=>{
      socket.destroy()
      resolve({
        host,
        port,
        open:true
      })
    })
  })
}

export default scan
