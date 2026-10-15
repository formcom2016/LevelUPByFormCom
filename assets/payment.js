(()=>{'use strict';
const links={ponctuel:'https://buy.stripe.com/4gMaEW0Lm8mr38jf6a4ko01',abo5:'https://buy.stripe.com/eVqaEW0LmeKPfV5f6a4ko02'};
const params=new URLSearchParams(location.search),id=params.get('id')||'';
const validId=/^[a-zA-Z0-9_-]{1,200}$/.test(id);
document.querySelectorAll('[data-stripe]').forEach(a=>{const url=new URL(links[a.dataset.stripe]);if(validId)url.searchParams.set('client_reference_id',id);a.href=url.href});
const adviser=document.querySelector('#payment-adviser');if(validId){adviser.hidden=false;adviser.textContent='Référence de votre rencontre : '+id;}
const copy=document.querySelector('#copy-payment-link'),status=document.querySelector('#payment-copy-status');copy?.addEventListener('click',async()=>{const url=new URL('paiement.html',location.href);if(validId)url.searchParams.set('id',id);try{await navigator.clipboard.writeText(url.href);status.textContent='Lien copié. Vous pouvez le transmettre.'}catch{status.textContent=url.href}});
})();
