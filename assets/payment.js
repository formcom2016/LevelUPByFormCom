(()=>{'use strict';
const links={ponctuel:'https://buy.stripe.com/4gMaEW0Lm8mr38jf6a4ko01',abo5:'https://buy.stripe.com/eVqaEW0LmeKPfV5f6a4ko02',abo10:'https://buy.stripe.com/9B64gy3XycCHdMX8HM4ko00'};
const params=new URLSearchParams(location.search),id=params.get('id')||'',validId=/^[a-zA-Z0-9_-]{1,200}$/.test(id);const gift=document.querySelector('#gift-perfumes'),status=document.querySelector('#gift-status');
// fcgift-- prefixes a voluntary gifting instruction; original participant ID follows unchanged.
// Reject an overlong gifted reference instead of silently losing or truncating the participant ID.
function update(){const chosen=!!gift?.checked;const ref=chosen?'fcgift--'+(validId?id:'direct'):(validId?id:'');const tooLong=ref.length>200;document.querySelectorAll('[data-stripe]').forEach(a=>{const url=new URL(links[a.dataset.stripe]);if(ref&&!tooLong)url.searchParams.set('client_reference_id',ref);a.href=url.href;a.setAttribute('aria-disabled',String(tooLong));});if(status)status.textContent=tooLong?'Pour enregistrer ce choix, contactez l’équipe avant de payer.':chosen?'Vos parfums seront offerts par l’association.':'';return !tooLong;}
if(gift)gift.checked=false;
gift?.addEventListener('change',update);document.querySelectorAll('[data-stripe]').forEach(a=>a.addEventListener('click',e=>{if(!update())e.preventDefault()}));update();
const adviser=document.querySelector('#payment-adviser');if(validId&&adviser){adviser.hidden=false;adviser.textContent='Référence de votre rencontre : '+id;}
const copy=document.querySelector('#copy-payment-link'),copyStatus=document.querySelector('#payment-copy-status');copy?.addEventListener('click',async()=>{const url=new URL('paiement.html',location.href);if(validId)url.searchParams.set('id',id);try{await navigator.clipboard.writeText(url.href);copyStatus.textContent='Lien copié. Vous pouvez le transmettre.'}catch{copyStatus.textContent=url.href}});
})();
