import {describe,it,expect,vi,beforeAll,afterAll} from 'vitest';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
let root:string;
let store:typeof import('../server/store');
beforeAll(async()=>{
  root=await mkdtemp(join(tmpdir(),'planner-quota-tests-'));
  vi.resetModules();
  const cwd=vi.spyOn(process,'cwd').mockReturnValue(join(root,'a','b'));
  try{store=await import('../server/store');}finally{cwd.mockRestore();}
});
afterAll(async()=>{await rm(root,{recursive:true,force:true});});
describe('private atomic model reservations',()=>{
  it('serializes concurrent reservations and safely settles real usage exactly once',async()=>{
    const results=await Promise.all([store.reserveModel(4000),store.reserveModel(4000)]);
    const accepted=results.find(r=>r.reservation)!;
    expect(results.filter(r=>r.reservation)).toHaveLength(1);
    expect(results.find(r=>!r.reservation)?.wait).toBeGreaterThan(0);
    await store.settleModel(accepted.reservation!,1000);
    await store.settleModel(accepted.reservation!,1000);
    const next=await store.reserveModel(4000);
    expect(next.reservation).not.toBeNull();
    const ledger=JSON.parse(await readFile(join(root,'private-runtime','usage-and-sources.json'),'utf8'));
    expect(ledger.models).toBe(2);expect(ledger.tokens).toBe(5000);
    expect(ledger.modelWindow.reduce((n:number,r:{tokens:number})=>n+r.tokens,0)).toBe(5000);
  });
  it('keeps full reservations when usage is absent and rejects an oversized request',async()=>{
    expect((await store.reserveModel(3000)).reservation).toBeNull();
    await expect(store.reserveModel(7001)).rejects.toMatchObject({code:'input_limit'});
  });
  it('never calls through corrupt operational storage or silently resets its quota',async()=>{
    const path=join(root,'private-runtime','usage-and-sources.json');
    await writeFile(path,'{invalid json');
    await expect(store.reserveModel(1)).rejects.toMatchObject({code:'operational_storage'});
    expect(await readFile(path,'utf8')).toBe('{invalid json');
  });
});
describe('private TinyFish Agent spending ledger',()=>{
  it('reads older ledgers without Agent fields, caps daily spend, and settles actual cost once',async()=>{
    const path=join(root,'private-runtime','usage-and-sources.json');
    const day=new Date().toISOString().slice(0,10);
    await writeFile(path,JSON.stringify({day,searches:0,urls:0,models:0,tokens:0,rates:[],modelWindow:[],listings:[]}));
    const first=await store.reserveAgent(400_000);
    await store.settleAgent(first,96_000);await store.settleAgent(first,96_000);
    let ledger=JSON.parse(await readFile(path,'utf8'));
    expect(ledger.agentMicroUsd).toBe(96_000);expect(ledger.agentRuns).toBe(1);
    // Unknown actual cost keeps the full reservation counted.
    const unknown=await store.reserveAgent(400_000);await store.settleAgent(unknown,null);
    await store.reserveAgent(400_000);await store.reserveAgent(400_000);
    ledger=JSON.parse(await readFile(path,'utf8'));
    expect(ledger.agentMicroUsd).toBe(1_296_000);
    await expect(store.reserveAgent(400_000)).rejects.toMatchObject({code:'agent_budget'});
    expect(store.AGENT_DAILY_MICRO_USD).toBe(1_500_000);
  });
});
