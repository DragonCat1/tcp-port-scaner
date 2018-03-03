export const portVerify = (p:number|string):verifyResult => {
  let port:number
  if(typeof p === 'string'){
    port = Number(p)
    if(isNaN(port)){
      return {
        success:false,
        message:`Port not correct, received ${p}`
      }
    }
  } else {
    port = p
  }
  if(port < 0 || port > 65535){
    return {
      success:false,
      message:`Port should be >= 0 and <= 65535, received ${p}`
    }
  }
  return {
    success:true,
    message:''
  }
}
