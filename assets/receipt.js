(()=>{'use strict';
const params=new URLSearchParams(location.search),order=params.get('commande'),token=params.get('suivi'),api=window.FORMCOM_CONFIG?.checkoutApi,box=document.querySelector('#order-receipt');
if(!api||!box||!order||!token||!/^FC-[a-f0-9-]{36}$/.test(order)||!/^[a-f0-9]{64}$/.test(token))return;
box.hidden=false;box.textContent='Vérification du paiement…';
async function load(){try{
 const url=new URL('/order',api);url.searchParams.set('id',order);url.searchParams.set('token',token);
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();
 box.replaceChildren();const title=document.createElement('h2');title.textContent=data.status==='paid'?'Votre paiement est confirmé.':'Votre paiement est en cours de vérification.';box.append(title);
 if(data.status!=='paid'){const p=document.createElement('p');p.textContent='Ne refaites pas de paiement si vous avez un doute. Vous pouvez demander une vérification à l’équipe.';box.append(p);return;}
 const p=document.createElement('p');p.textContent='Référence : '+order+' · Montant réglé : '+new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(data.amount/100);box.append(p);
 const list=document.createElement('ul');for(const item of data.items){const li=document.createElement('li');li.textContent=item.quantity+' × '+item.name;list.append(li)}box.append(list);
 const next=document.createElement('p');next.textContent=data.gift?'Vous avez choisi de faire offrir vos parfums par l’association.':'Vos parfums sont à retirer gratuitement auprès de l’association, sur rendez-vous.';box.append(next);
 const appointment=document.querySelector('#receipt-appointment');if(appointment)appointment.href='mes-demarches.html?demarche='+(data.gift?'offrir':'retrait')+'&reference='+encodeURIComponent(order);
 // Clear only the exact cart that was paid for; never discard a later selection.
 try{const pending=JSON.parse(sessionStorage.getItem('formcom_pending_cart')||'null');if(pending?.order===order&&sessionStorage.getItem('formcom_cart_v1')===pending.cart)sessionStorage.removeItem('formcom_cart_v1')}catch{}
 }catch{box.textContent='Nous n’avons pas pu vérifier le paiement depuis cette page. Conservez votre confirmation Stripe et contactez l’équipe avant de renouveler un règlement.';}}
load();
})();
