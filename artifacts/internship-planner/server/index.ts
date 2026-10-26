import express,{type Request,type Response,type NextFunction} from 'express';
import { createHmac,randomUUID } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { PreferencesSchema } from '../shared/schemas';
import { createRun,getRun,cancelRun } from './discovery';
import { reserveRun,checkOperationalStore } from './store';
import { PublicError,publicMessage } from './errors';
import { ownerCookie,readOwnerCookie,requireOwnerCookie } from './owner';
import { createPreparation,getPreparation,cancelPreparation } from './preparation';
import { AnswersSchema,createAssessment,getAssessment } from './assessment';
import { agentEnabled } from './agent';
const app=express();
app.disable('x-powered-by');app.set('trust proxy',false);
const secret=process.env.SESSION_SECRET;
if(!secret)throw Error('SESSION_SECRET must be configured before starting the service.');
const digest=(id:string)=>createHmac('sha256',secret).update(`quota:${id}`).digest('hex');
app.use((req,res,next)=>{
  const start=Date.now();res.locals.requestId=randomUUID();
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store'});
  if(process.env.NODE_ENV==='production')res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; object-src 'none'");
  res.on('finish',()=>console.log(JSON.stringify({requestId:res.locals.requestId,stage:req.path.startsWith('/api/')?'api':'web',method:req.method,status:res.statusCode,durationMs:Date.now()-start})));
  next();
});
app.use('/api',express.json({limit:'32kb',strict:true}));
app.use('/api',(req,res,next)=>{
  if(['POST','PUT','DELETE','PATCH'].includes(req.method)){
    const origin=req.get('origin');
    const configured=process.env.REPLIT_DEV_DOMAIN;
    let valid=false;
    if(origin)try{const u=new URL(origin);valid=u.host===req.get('host')||!!configured&&u.hostname===configured;}catch{}
    // Missing Origin is permitted only for non-browser CLI checks; browser requests must be same-origin.
    if(origin&&!valid||!origin&&req.get('sec-fetch-site')){next(new PublicError('origin','This request did not come from the app.',403));return;}
  }
   const existing=readOwnerCookie(req.headers.cookie,secret);
   const id=existing??randomUUID();
   res.locals.ownerRecognized=existing!==null;
   if(!existing){
    const secure=!!process.env.REPLIT_DEV_DOMAIN||process.env.NODE_ENV==='production';
     res.setHeader('Set-Cookie',ownerCookie(id,secret,secure));
  }
  res.locals.owner=digest(id);
  // Only the directly connected socket is trusted. Arbitrary X-Forwarded-For cannot reset quotas.
  res.locals.ip=digest(req.socket.remoteAddress??'unknown');
  next();
});
app.get('/api/health',async(_req,res,next)=>{try{
  await checkOperationalStore();
  res.json({status:'ok',operationalStore:'ready',providers:{tinyfish:!!process.env.TINYFISH_API_KEY,groq:!!process.env.GROQ_API_KEY},agentFallback:agentEnabled()});
}catch(error){next(error);}});
app.get('/api/bootstrap',(_req,res)=>res.json({sessionAvailable:res.locals.ownerRecognized,configuration:{tinyfish:!!process.env.TINYFISH_API_KEY,groq:!!process.env.GROQ_API_KEY},
  limits:{searchesPerBrowserHour:2,searchesPerTrustedNetworkHour:6,preparationsPerBrowserHour:2,assessmentsPerBrowserHour:3,runSeconds:180,preparationSeconds:180,assessmentSeconds:90,runQueries:8,runUrls:20},privacy:'Personal progress stays in this browser. Bounded public-source snapshots and anonymous operational quotas are private server records; providers receive only the input needed for each step.'}));
app.post('/api/searches',async(req,res,next)=>{try{
  const input=z.strictObject({preferences:PreferencesSchema,continuation:z.string().uuid().nullable()}).parse(req.body);
   requireOwnerCookie(res.locals.ownerRecognized);
  if(!process.env.TINYFISH_API_KEY||!process.env.GROQ_API_KEY)throw new PublicError('configuration','TinyFish and Groq must be configured before live discovery.');
  if(input.continuation)getRun(input.continuation,res.locals.owner);
  await reserveRun(res.locals.owner,res.locals.ip,'search');
  const runId=createRun(res.locals.owner,input.preferences,input.continuation);
  res.status(202).json({runId});
}catch(error){next(error);}});
app.get('/api/searches/:id',(req,res,next)=>{try{res.json(getRun(z.string().uuid().parse(req.params.id),res.locals.owner).run);}catch(error){next(error);}});
app.post('/api/searches/:id/cancel',(req,res,next)=>{try{cancelRun(z.string().uuid().parse(req.params.id),res.locals.owner);res.json({cancelled:true});}catch(error){next(error);}});
const targetRefs=z.array(z.strictObject({id:z.string().max(80),version:z.string().max(80)})).min(1).max(200);
app.post('/api/preparations',async(req,res,next)=>{try{
  requireOwnerCookie(res.locals.ownerRecognized);
  const input=z.strictObject({targets:targetRefs,continuation:z.string().uuid().nullable()}).parse(req.body);
  await reserveRun(res.locals.owner,res.locals.ip,'preparation');
  res.status(202).json({runId:await createPreparation(res.locals.owner,input.targets,input.continuation)});
}catch(error){next(error);}});
app.get('/api/preparations/:id',(req,res,next)=>{try{res.json(getPreparation(z.string().uuid().parse(req.params.id),res.locals.owner).run);}catch(error){next(error);}});
app.post('/api/preparations/:id/cancel',(req,res,next)=>{try{cancelPreparation(z.string().uuid().parse(req.params.id),res.locals.owner);res.json({cancelled:true});}catch(error){next(error);}});
app.post('/api/assessments',async(req,res,next)=>{try{
  requireOwnerCookie(res.locals.ownerRecognized);
  const input=z.strictObject({packId:z.string().uuid(),answers:AnswersSchema}).parse(req.body);
  await reserveRun(res.locals.owner,res.locals.ip,'assessment');
  res.status(202).json({runId:await createAssessment(res.locals.owner,input.packId,input.answers)});
}catch(error){next(error);}});
app.get('/api/assessments/:id',(req,res,next)=>{try{res.json(getAssessment(z.string().uuid().parse(req.params.id),res.locals.owner));}catch(error){next(error);}});
app.use('/api',(_req,res)=>res.status(404).json({error:{code:'not_found',message:'This API route does not exist.'}}));
app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  const invalid=error instanceof z.ZodError;
  const e=error as {type?:string;status?:number};
  const status=invalid?400:error instanceof PublicError?error.status:e.type==='entity.too.large'?413:e.type==='entity.parse.failed'?400:500;
  if(error instanceof PublicError&&error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));
  res.status(status).json({error:{code:invalid?'invalid_input':error instanceof PublicError?error.code:'request_failed',
    message:invalid?'Check the submitted values; the input did not match the accepted form.':e.type==='entity.too.large'?'The request is too large.':publicMessage(error),requestId:res.locals.requestId}});
});
const port=Number(process.env.PORT)||22950;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=createHttpServer(app);
if(process.env.NODE_ENV==='production'){
  app.use(express.static(resolve(root,'dist/public')));
  app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/public/index.html')));
}else{
  const {createServer}=await import('vite');
   const vite=await createServer({root,server:{middlewareMode:true,hmr:{server,clientPort:process.env.REPLIT_DEV_DOMAIN?443:port}},appType:'spa'});
  app.use(vite.middlewares);
}
server.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({stage:'startup',port,providers:{tinyfish:!!process.env.TINYFISH_API_KEY,groq:!!process.env.GROQ_API_KEY},agentFallback:agentEnabled()})));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
