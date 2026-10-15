import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker,{amountFor,validateCart} from '../server/stripe-worker.mjs';
if(!globalThis.crypto)Object.defineProperty(globalThis,"crypto",{value:webcrypto});
test('offer prices and invalid cart boundaries',()=>{
 for(const [n,amount]of [[1,1000],[2,2000],[3,3000],[5,4000],[8,6000],[15,10000],[16,11000],[20,14000],[23,16000]])assert.equal(amountFor(n),amount);
 for(const items of [[],[{id:'unknown',quantity:1}],[{id:'__proto__',quantity:1}],[{id:'desert',quantity:1.5}],[{id:'desert',quantity:-1}],[{id:'desert',quantity:201}],[{id:'desert',quantity:1},{id:'desert',quantity:1}]])assert.throws(()=>validateCart({items}));
 assert.throws(()=>validateCart({items:[{id:'desert',quantity:1}],gift:'yes'}));
 assert.throws(()=>validateCart({items:[{id:'desert',quantity:1}],participant:'invalid reference'}));
 assert.equal(validateCart({items:[{id:'desert',quantity:5}],amount:1}).amount,4000);
});
test('checkout recalculates amount; signed webhook is the only payment confirmation',async()=>{
 const records=new Map(),env={SITE_ORIGIN:'https://formcom2016.github.io',STRIPE_SECRET_KEY:'test-fixture-not-a-key',STRIPE_WEBHOOK_SECRET:'test-fixture-secret',ORDERS:{get:async key=>records.get(key)||null,put:async(key,value)=>records.set(key,value)}};
 const originalFetch=globalThis.fetch;let submitted;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');submitted=new URLSearchParams(options.body);return new Response(JSON.stringify({id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/test-fixture'}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{
  const req=(origin,items)=>new Request('https://example.workers.dev/checkout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({items,gift:true,amount:1,participant:'AP7'})});
  assert.equal((await worker.fetch(req('https://other.example',[{id:'desert',quantity:5}]),env)).status,403);
  const response=await worker.fetch(req(env.SITE_ORIGIN,[{id:'desert',quantity:2},{id:'cosmic',quantity:3}]),env);assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.amount,4000);assert.equal(submitted.get('line_items[0][price_data][unit_amount]'),'4000');assert.equal(submitted.get('metadata[gift]'),'true');assert.equal(submitted.get('client_reference_id'),'AP7');
  const success=new URL(submitted.get('success_url')),token=success.searchParams.get('suivi');assert.equal(token.length,64);
  const query=new URL('https://example.workers.dev/order');query.searchParams.set('id',result.order);query.searchParams.set('token',token);
  const status=()=>worker.fetch(new Request(query,{headers:{Origin:env.SITE_ORIGIN}}),env);
  assert.equal((await(await status()).json()).status,'created');
  const session={id:'cs_test_fixture',currency:'eur',amount_total:4000,payment_status:'paid',payment_intent:'pi_fixture',metadata:{order_id:result.order}};
  const sendEvent=async(obj,signature=true,timestamp=Math.floor(Date.now()/1000))=>{const body=JSON.stringify({id:'evt_fixture',type:'checkout.session.completed',data:{object:obj}});let header='';if(signature){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signed=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body))).toString('hex');header='t='+timestamp+',v1='+signed}return worker.fetch(new Request('https://example.workers.dev/webhook',{method:'POST',headers:{'Stripe-Signature':header},body}),env)};
  assert.equal((await sendEvent(session,false)).status,400);assert.equal((await sendEvent(session,true,1)).status,400);
  assert.equal((await sendEvent({...session,amount_total:1000})).status,409);
  await sendEvent({...session,payment_status:'unpaid'});assert.equal((await(await status()).json()).status,'created');
  assert.equal((await sendEvent(session)).status,200);const paid=await(await status()).json();assert.equal(paid.status,'paid');assert.equal(paid.gift,true);assert.deepEqual(paid.items,[{name:'Desert Mirage',quantity:2},{name:'Cosmic Tonka',quantity:3}]);assert.equal(paid.tokenHash,undefined);
  const before=records.get('order:'+result.order);await sendEvent(session);assert.equal(records.get('order:'+result.order),before);
  query.searchParams.set('token','a'.repeat(64));assert.equal((await status()).status,404);
 }finally{globalThis.fetch=originalFetch}
});
