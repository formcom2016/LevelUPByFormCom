/* Economic hypotheses confirmed by Form’Com: 2 € cost per delivered perfume,
   participant share = 50% of sale receipts less delivered-product cost. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FormComSimulator=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const OFFERS=[{id:'one',units:1,price:10,label:'1 parfum',gift:0},{id:'two',units:2,price:20,label:'2 parfums',gift:0},{id:'three',units:3,price:30,label:'3 parfums',gift:0},{id:'five',units:5,price:40,label:'Collection de 5',gift:1},{id:'eight',units:8,price:60,label:'Collection de 8',gift:2}];
function mix(perDay,days,eightPerWeek=1){const total=Math.max(0,Math.round(perDay*days));const quantities={one:0,two:0,three:0,five:0,eight:0};let left=total;
 // A few collections across the month; small sales carry most of the activity.
 const eight=perDay>=15?Math.round(days/5*eightPerWeek):0;quantities.eight=Math.min(eight,Math.floor(left/8));left-=quantities.eight*8;
 const five=Math.round(days*.75*Math.min(1,perDay/20));quantities.five=perDay>=5?Math.min(five,Math.floor(left/5)):0;left-=quantities.five*5;
 const three=Math.round(days*2.5*Math.min(1,perDay/15));quantities.three=perDay>=3?Math.min(three,Math.floor(left/3)):0;left-=quantities.three*3;
 quantities.two=Math.floor(left*.75/2);quantities.one=left-quantities.two*2;
 return OFFERS.map(o=>({...o,count:quantities[o.id],cost:o.units*2,share:(o.price-o.units*2)/2}));}
function calculate({perDay=10,days=20,months=10,eightPerWeek=1,route='project',acreMonths=0,liberatoire=false,socialRate=.212,cfpRate=.001,vlRate=.017}){
 const rows=mix(perDay,days,eightPerWeek);const units=rows.reduce((a,r)=>a+r.count*r.units,0);const sales=rows.reduce((a,r)=>a+r.count,0);const receipts=rows.reduce((a,r)=>a+r.count*r.price,0);const cost=units*2;const gross=(receipts-cost)/2;
 const activeAcre=Math.max(0,Math.min(months,Math.floor(acreMonths)));const tax=liberatoire?vlRate:0;const ordinary=gross*(1-socialRate-cfpRate-tax);const reduced=gross*(1-socialRate*.75-cfpRate-tax);const monthly=route==='income'?(activeAcre>0?reduced:ordinary):gross;const period=route==='income'?reduced*activeAcre+ordinary*(months-activeAcre):gross*months;
 return {rows,units,sales,receipts,cost,gross,monthly,period,ordinary,reduced,activeAcre,monthlySocial:gross*socialRate*(activeAcre>0?.75:1),monthlyCfp:gross*cfpRate,monthlyTax:gross*tax,monthlyContribution:receipts-cost-gross};}
function dayExamples(perDay){const q=Math.max(0,Math.round(perDay));if(!q)return [];
 function finish(title,description,counts){let remaining=q-Object.entries(counts).reduce((n,[id,count])=>n+OFFERS.find(o=>o.id===id).units*count,0);const two=Math.floor(remaining*(title==='Avec une collection occasionnelle'?.9:.75)/2);counts.two=two;counts.one=remaining-two*2;const rows=OFFERS.map(o=>({...o,count:counts[o.id]||0}));return {title,description,rows,units:q,sales:rows.reduce((n,o)=>n+o.count,0)};}
 const smallThree=Math.floor(q*.2/3),smallRemaining=q-smallThree*3,smallTwo=Math.floor(smallRemaining/3);const small=finish('Surtout de petites ventes','Des achats de un ou deux parfums, avec quelques trios.',{three:smallThree,two:0});small.rows.find(r=>r.id==='two').count=smallTwo;small.rows.find(r=>r.id==='one').count=smallRemaining-smallTwo*2;small.sales=small.rows.reduce((n,r)=>n+r.count,0);
 const five=q>=5?Math.max(1,Math.floor(q/30)):0;const three=Math.min(Math.floor(q/10),Math.floor((q-five*5)/3));const balanced=finish(five?'Avec une collection':'Une autre répartition',five?'Une collection de cinq, complétée par des ventes plus petites.':'Quelques personnes choisissent plusieurs parfums.',{five,three});
 let eight=q>=8?Math.max(1,Math.floor(q/40)):0;let bigFive=q>=eight*8+5?Math.max(1,Math.floor(q/40)):0;let bigThree=Math.min(Math.floor(q*.1/3),Math.floor((q-eight*8-bigFive*5)/3));const big=finish(eight?'Avec une collection occasionnelle':'Des ventes groupées',eight?'Une journée qui comprend une collection de huit parfums.':'Une journée avec davantage de parfums choisis ensemble.',{eight,five:bigFive,three:bigThree});
 const seen=new Set();return [small,balanced,big].filter(e=>{const key=e.rows.map(r=>r.count).join(',');if(seen.has(key))return false;seen.add(key);return true;});}
return {OFFERS,mix,calculate,dayExamples};});
