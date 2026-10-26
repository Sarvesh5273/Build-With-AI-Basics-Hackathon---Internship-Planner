export class PublicError extends Error {
  constructor(public code:string,message:string,public status=503,public retryAfter:number|null=null){super(message);}
}
export function publicMessage(error:unknown){
  if(error instanceof PublicError)return error.message;
  if(error instanceof Error&&['AbortError','TimeoutError'].includes(error.name))return 'This step was interrupted. Accepted evidence remains available.';
  return 'This step could not be completed safely. Your browser progress is preserved.';
}
