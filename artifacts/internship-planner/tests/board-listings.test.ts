import { describe, it, expect } from 'vitest';
import { feedPostings, htmlText, postingDraft, postingListing, workdayBase, boardOrganization } from '../server/board-listings';
import { detectBoard } from '../server/source-boards';

const greenhouse=detectBoard('https://boards.greenhouse.io/acme')!;
describe('structured public job-board postings',()=>{
  it('decodes entity-encoded Greenhouse HTML into plain text without markup',()=>{
    expect(htmlText('&lt;h2&gt;About &amp;amp; us&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('About & us\n\n- Python');
  });
  it('keeps only internship titles and maps the feed fields',()=>{
    const rows=feedPostings(greenhouse,{jobs:[
      {title:'Machine Learning Intern',absolute_url:'https://boards.greenhouse.io/acme/jobs/1',company_name:'Acme AI',location:{name:'Tokyo, Japan'},content:'&lt;p&gt;Join us.&lt;/p&gt;',application_deadline:'2026-12-01T00:00:00Z'},
      {title:'Staff Engineer',absolute_url:'https://boards.greenhouse.io/acme/jobs/2'},
      {title:'Data Intern',absolute_url:'http://insecure.example/jobs/3'},
    ]});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({organization:'Acme AI',location:'Tokyo, Japan',description:'Join us.',deadline:'2026-12-01T00:00:00Z'});
  });
  it('derives only quoted facts, and evidence validation accepts them',()=>{
    const posting={url:'https://boards.greenhouse.io/acme/jobs/1',title:'Machine Learning Intern 2027',organization:'Acme AI',location:'Remote, Japan',workplace:'',
      description:'You will train models.\nVisa sponsorship is available for this role.\nThe stipend is ¥300,000 per month.',deadline:'2026-12-01T00:00:00Z',compensation:''};
    const built=postingListing(posting,greenhouse,'Acme AI','test ownership',true,'2026-10-24T00:00:00.000Z')!;
    const kinds=Object.fromEntries(built.listing!.facts.map(f=>[f.kind,f.value]));
    expect(kinds).toMatchObject({location:'Remote, Japan',remote:'remote',visa:'supported',funding:'partial',deadline:'Application deadline 2026-12-01'});
    expect(built.listing!.cycleKey).toBe('2027');
    expect(built.listing!.facts.every(f=>built.page.text.includes(f.quote))).toBe(true);
  });
  it('classifies a negative sponsorship sentence as unsupported, never supported',()=>{
    const {draft}=postingDraft({url:'https://x.example/1',title:'Software Intern',organization:'',location:'',workplace:'',description:'Unfortunately we are unable to provide visa sponsorship.',deadline:null,compensation:''},'Acme','id')!;
    expect(draft.facts.find(f=>f.kind==='visa')?.value).toBe('unsupported');
  });
  it('builds the Workday search address only from a validated board',()=>{
    expect(workdayBase(detectBoard('https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US/Intern_JR1')!)).toBe('https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite');
  });
  it('prefers the posting text casing of the board name for organization display',()=>{
    const board=detectBoard('https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite')!;
    expect(boardOrganization(board,{url:'',title:'',organization:'',location:'',workplace:'',description:'At NVIDIA we build GPUs.',deadline:null,compensation:''},[])).toBe('NVIDIA');
    const generic=detectBoard('https://job-boards.greenhouse.io/usinternshipspubliccareerssite')!;
    expect(boardOrganization(generic,{url:'',title:'',organization:'US Internships Public Careers Site',location:'',workplace:'',description:"PlayStation's team builds tools.",deadline:null,compensation:''},[])).toBe('Employer not named by the board (“US Internships Public Careers Site”)');
    expect(boardOrganization(board,{url:'',title:'',organization:'US Internships Public Careers Site',location:'',workplace:'',description:'At NVIDIA we build GPUs.',deadline:null,compensation:''},[])).toBe('NVIDIA');
  });
});
describe('merging a duplicate posting into a shown (ranked) listing',()=>{
  it('stores only the listing shape, without ranking fields',async()=>{
    const { mergeListings } = await import('../server/evidence');
    const { ListingSchema } = await import('../shared/schemas');
    const posting={url:'https://boards.greenhouse.io/acme/jobs/1',title:'Software Intern 2027',organization:'Acme',location:'Tokyo',workplace:'',description:'Build tools.',deadline:null,compensation:''};
    const a=postingListing(posting,greenhouse,'Acme','o',false,'2026-10-24T00:00:00.000Z')!.listing!;
    const b=postingListing({...posting,url:'https://boards.greenhouse.io/acme/jobs/2'},greenhouse,'Acme','o',false,'2026-10-24T00:00:00.000Z')!.listing!;
    const ranked={...a,score:50,reasons:['x'],excluded:false};
    expect(ListingSchema.safeParse(mergeListings(ranked,b)).success).toBe(false); // the bug: ranking keys leak through a merge
    const {score:_s,reasons:_r,excluded:_e,...plain}=ranked;
    expect(ListingSchema.safeParse(mergeListings(plain,b)).success).toBe(true);
  });
});
describe('cycle-aware same-internship merging',()=>{
  const make=(id:string,title:string,description:string,deadline:string|null)=>postingListing({url:`https://boards.greenhouse.io/acme/jobs/${id}`,title,organization:'Acme',location:'Tokyo',workplace:'',description,deadline,compensation:''},greenhouse,'Acme','o',true,'2026-10-24T00:00:00.000Z')!.listing!;
  it('never merges an archived page (old deadline, no cycle key) into the current posting',async()=>{
    const { sameInternship } = await import('../server/evidence');
    const current={...make('1','Software Intern','Build tools.',null),cycleKey:'2027'};
    const archived=make('2','Software Intern','Build tools.','2025-12-01T00:00:00Z');
    expect(archived.cycleKey).toBe('');
    expect(sameInternship(current,archived)).toBe(false);
    expect(sameInternship(archived,current)).toBe(false);
    // Neither side keyed: a dated deadline on only one side still keeps them apart.
    expect(sameInternship({...current,cycleKey:''},archived)).toBe(false);
    // Different dated deadlines are different cycles.
    expect(sameInternship(make('3','Software Intern','Build tools.','2026-12-01T00:00:00Z'),archived)).toBe(false);
  });
  it('still merges pages that agree, including a matching deadline',async()=>{
    const { sameInternship } = await import('../server/evidence');
    expect(sameInternship(make('1','Software Intern','Build tools.','2026-12-01T00:00:00Z'),make('2','Software Intern','Build tools.','2026-12-01T00:00:00Z'))).toBe(true);
    expect(sameInternship({...make('1','Software Intern','Build tools.',null),cycleKey:'2027'},make('2','Software Intern','Build tools.',null))).toBe(true);
    expect(sameInternship({...make('1','Software Intern','Build tools.',null),cycleKey:'2027'},{...make('2','Software Intern','Build tools.',null),cycleKey:'2026'})).toBe(false);
  });
});
describe('official backlink to an employer board',()=>{
  it('matches the same board across address forms, never a different tenant or platform',async()=>{
    const { sameAtsBoard } = await import('../server/discovery');
    expect(sameAtsBoard('https://boards.greenhouse.io/tanium','https://job-boards.greenhouse.io/tanium')).toBe(true);
    expect(sameAtsBoard('https://boards.greenhouse.io/embed/job_board?for=tanium','https://job-boards.greenhouse.io/tanium')).toBe(true);
    expect(sameAtsBoard('https://tencent.wd1.myworkdayjobs.com/en-US/Tencent_Careers','https://tencent.wd1.myworkdayjobs.com/Tencent_Careers')).toBe(true);
    expect(sameAtsBoard('https://boards.greenhouse.io/other','https://job-boards.greenhouse.io/tanium')).toBe(false);
    expect(sameAtsBoard('https://jobs.lever.co/tanium','https://job-boards.greenhouse.io/tanium')).toBe(false);
    expect(sameAtsBoard('https://boards.greenhouse.io/embed/job_board?for=other','https://job-boards.greenhouse.io/tanium')).toBe(false);
  });
});
