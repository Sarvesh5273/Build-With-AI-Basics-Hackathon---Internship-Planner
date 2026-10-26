import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PublicError } from './errors';
export function parsePublicUrl(raw:string): URL {
  let url:URL;
  try{url=new URL(raw);}catch{throw new PublicError('unsafe_url','The source URL is not valid.',400);}
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||raw.length>2000||
    isIP(host)||host.includes(':')||!host.includes('.')||/(^|\.)(localhost|local|internal|invalid|test|example)$/.test(host)||
    /[^\x21-\x7e]/.test(host))throw new PublicError('unsafe_url','Only public HTTPS sources without credentials are supported.',400);
  url.hash='';return url;
}
export function isPublicAddress(ip:string){
  if(isIP(ip)===4){
    const [a,b]=ip.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===192&&b===2||a===203&&b===0);
  }
  if(isIP(ip)===6)return !/^(::|fe[89ab]|f[cd]|2001:db8|64:ff9b)/i.test(ip)&&!ip.includes('.');
  return false;
}
export async function safeUrl(raw:string){
  const url=parsePublicUrl(raw);
  const addresses=await Promise.race([lookup(url.hostname,{all:true}),new Promise<never>((_,reject)=>{const t=setTimeout(()=>reject(new PublicError('source_dns','Source lookup timed out.')),2500);t.unref();})]);
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new PublicError('unsafe_url','The source does not resolve exclusively to public addresses.',400);
  return url.href;
}
export function normalizedHost(raw:string){return parsePublicUrl(raw).hostname.replace(/^www\./,'');}
