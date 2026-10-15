// Deployment preparation only: no secret belongs in GitHub or browser code.
// Required bindings: ORDERS (KV), STRIPE_SECRET_KEY (secret), STRIPE_WEBHOOK_SECRET
// (secret), SITE_ORIGIN (the exact https://... GitHub Pages origin).
export const CATALOG=Object.freeze({desert:'Desert Mirage',cosmic:'Cosmic Tonka',western:'Western Shisha',sultan:'Sultan El Waha',ameerat:'Ameerat Al Arab',yumyum:'Yum Yum Delights',sahghaf:'Sahghaf Oud Tonka',direction:'Direction'});
export function amountFor(n){if(!Number.isInteger(n)||n<1||n>200)throw Error('Quantité invalide.');const prices=Array(n+1).fill(Infinity);prices[0]=0;for(let i=1;i<=n;i++)for(const [q,price]of [[1,1000],[3,3000],[5,4000],[8,6000],[15,10000]])if(q<=i)prices[i]=Math.min(prices[i],prices[i-q]+price);return prices[n];}
export function validateCart(input){if(!input||!Array.isArray(input.items)||!input.items.length||input.items.length>8)throw Error('Panier invalide.');let total=0;const seen=new Set();const items=input.items.map(item=>{if(!item||!Object.hasOwn(CATALOG,item.id)||seen.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>200)throw Error('Parfum ou quantité invalide.');seen.add(item.id);total+=item.quantity;return{id:item.id,name:CATALOG[item.id],quantity:item.quantity}});if(total>200)throw Error('Le panier dépasse 200 parfums.');if(input.gift!==undefined&&typeof input.gift!=='boolean')throw Error('Choix de remise invalide.');if(input.participant!==undefined&&!/^[a-zA-Z0-9_-]{1,192}$/.test(input.participant))throw Error('Référence invalide.');return{items,count:total,amount:amountFor(total),gift:input.gift===true,participant:input.participant||''};}
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async text=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
async function verifiedSignature(body,header,secret){if(!header||!secret)return false;const parts=header.split(','),timestamp=parts.find(x=>x.startsWith('t='))?.slice(2),signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));if(!/^\d+$/.test(timestamp||'')||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);for(const signature of signatures){if(!/^[a-f0-9]{64}$/.test(signature))continue;const bytes=new Uint8Array(signature.match(/../g).map(x=>parseInt(x,16)));if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(timestamp+'.'+body)))return true}return false;}
async function stripe(env,path,fields,idempotency){const response=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded',...(idempotency?{'Idempotency-Key':idempotency}:{})},body:fields});const data=await response.json();if(!response.ok)throw Error('Le paiement est momentanément indisponible.');return data;}
export default {async fetch(request,env){const url=new URL(request.url);const origin=request.headers.get('Origin');let site;try{site=new URL(env.SITE_ORIGIN)}catch{return json({error:'Service non configuré.'},503)}if(site.protocol!=='https:')return json({error:'Configuration invalide.'},503);const cors={'Access-Control-Allow-Origin':site.origin,'Vary':'Origin'};
 if(request.method==='OPTIONS'){if(origin!==site.origin)return json({error:'Origine refusée.'},403);return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
 if(!env.ORDERS||!env.STRIPE_SECRET_KEY||!env.STRIPE_WEBHOOK_SECRET)return json({error:'Service non configuré.'},503,cors);
 try{
 if(url.pathname==='/checkout'&&request.method==='POST'){
  if(origin!==site.origin)return json({error:'Origine refusée.'},403,cors);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Format invalide.'},415,cors);
  const raw=await request.text();if(raw.length>10000)return json({error:'Panier trop volumineux.'},413,cors);let cart;try{cart=validateCart(JSON.parse(raw))}catch{return json({error:'Vérifiez les produits et les quantités du panier.'},400,cors)}
  // The trusted Cloudflare IP header is used only as a hashed, short-lived limiter.
  const ip=request.headers.get('CF-Connecting-IP');if(ip){const key='limit:'+await hash(ip+':'+Math.floor(Date.now()/600000));const count=Number(await env.ORDERS.get(key)||0);if(count>=12)return json({error:'Trop de tentatives. Réessayez dans quelques minutes.'},429,cors);await env.ORDERS.put(key,String(count+1),{expirationTtl:600})}
  const id='FC-'+crypto.randomUUID(),token=hex(crypto.getRandomValues(new Uint8Array(32))),siteBase=site.origin+'/LevelUPByFormCom/';
  const success=new URL('merci.html',siteBase);success.searchParams.set('commande',id);success.searchParams.set('suivi',token);
  const form=new URLSearchParams({mode:'payment',success_url:success.href,cancel_url:new URL('boutique.html#selection',siteBase).href,client_reference_id:cart.participant||id,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(cart.amount),'line_items[0][price_data][product_data][name]':cart.count+' parfums solidaires - Form’Com','line_items[0][price_data][product_data][description]':cart.items.map(x=>x.quantity+' × '+x.name).join(' · '),'metadata[order_id]':id,'metadata[gift]':String(cart.gift),'metadata[participant]':cart.participant,'payment_intent_data[metadata][order_id]':id});
  const order={id,...cart,tokenHash:await hash(token),status:'created',createdAt:new Date().toISOString()};await env.ORDERS.put('order:'+id,JSON.stringify(order));
  const session=await stripe(env,'checkout/sessions',form,id);if(!session.url||new URL(session.url).hostname!=='checkout.stripe.com')throw Error('Réponse de paiement invalide.');order.sessionId=session.id;await env.ORDERS.put('order:'+id,JSON.stringify(order));
  return json({url:session.url,order:id,amount:cart.amount},200,cors);
 }
 if(url.pathname==='/webhook'&&request.method==='POST'){
  const body=await request.text();if(body.length>1000000||!await verifiedSignature(body,request.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET))return json({error:'Signature invalide.'},400);
  let event;try{event=JSON.parse(body)}catch{return json({error:'Événement invalide.'},400)}
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return json({received:true});
  const session=event.data?.object,id=session?.metadata?.order_id;if(!id||!/^FC-[a-f0-9-]{36}$/.test(id))return json({received:true});
  const raw=await env.ORDERS.get('order:'+id);if(!raw)return json({error:'Commande absente.'},503);const order=JSON.parse(raw);
  if(!order.sessionId)return json({error:'Commande en préparation.'},503);
  if(session.id!==order.sessionId||session.currency!=='eur'||session.amount_total!==order.amount)return json({error:'Commande incohérente.'},409);
  if(session.payment_status==='paid'&&order.status!=='paid'){order.status='paid';order.paidAt=new Date().toISOString();order.paymentId=session.payment_intent;await env.ORDERS.put('order:'+id,JSON.stringify(order))}
  // Repeated events overwrite no ledger and never trigger an extra perfume allocation.
  return json({received:true});
 }
 if(url.pathname==='/order'&&request.method==='GET'){
  if(origin!==site.origin)return json({error:'Origine refusée.'},403,cors);const id=url.searchParams.get('id'),token=url.searchParams.get('token');if(!/^FC-[a-f0-9-]{36}$/.test(id||'')||!(/^[a-f0-9]{64}$/.test(token||'')))return json({error:'Référence invalide.'},400,cors);
  const raw=await env.ORDERS.get('order:'+id);if(!raw)return json({error:'Commande introuvable.'},404,cors);const order=JSON.parse(raw);if(await hash(token)!==order.tokenHash)return json({error:'Commande introuvable.'},404,cors);
  return json({reference:id,status:order.status,amount:order.amount,items:order.items.map(({name,quantity})=>({name,quantity})),gift:order.gift},200,cors);
 }
 return json({error:'Page introuvable.'},404,cors);
 }catch{return json({error:'Le service est momentanément indisponible. Contactez l’association avant de recommencer un paiement.'},503,cors)}
}};
