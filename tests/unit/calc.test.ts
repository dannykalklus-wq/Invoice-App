const num = (v:any)=>{ const n = typeof v==='number'?v:parseFloat(String(v).replace(/,/g,'')); return Number.isFinite(n)?n:0; };
const totalOf = (items:any[], tax:number, disc:number, ship:number) => {
  const sub = items.reduce((s,i)=> s + num(i.qty)*num(i.rate), 0);
  const vat = sub * (num(tax)/100);
  return sub - num(disc) + vat + num(ship);
};
describe('calc', ()=> {
  it('empty', ()=> expect(totalOf([],0,0,0)).toBe(0));
  it('calc', ()=> { const items=[{qty:2, rate:10}, {qty:1, rate:5}]; expect(totalOf(items,10,3,2)).toBeCloseTo(24.5); });
});
