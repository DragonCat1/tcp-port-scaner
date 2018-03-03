import {Command} from 'commander'

interface ICliArgs {
  target?:string[],
  ports:string[],
  thread?:string,
  file?:string,
  timeout:string,
  mode:string
}

const init = ():Command=>{
  const program = new Command()
  program.option('-t,--target <target...>','target')
  program.requiredOption('-p,--ports <ports...>','ports')
  program.option('-th,--thread <thread>','thread','5')
  program.option('-f,--file <path>','iplist file')
  program.option('--timeout <timeout>','tcp timeout(ms)','2000')
  program.option('--mode <mode>','mode','1')
  program.parse(process.argv)
  return program
}

export const getOptions = async ():Promise<ICliArgs>=>{
  const program = init()
  const options = program.opts() as ICliArgs
  if(!options.target){
    options.target=[]
  }
  if(!options.target.length && !options.file){
    console.log(`error: required option '-t <target...>' or '-f <path> not specified`)
    process.exit()
  }
  return options
}
