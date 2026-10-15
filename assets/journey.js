(()=>{'use strict';
const $=q=>document.querySelector(q),params=new URLSearchParams(location.search);
function prepare(kind,subject,body,summary){
 const review=$('#'+kind+'-review');review.hidden=false;
 $('#'+kind+'-summary').textContent=summary;
 const email=$('#'+kind+(kind==='application'?'-email':'-email-link'));
 email.href='mailto:Formcom2016@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 $('#'+kind+'-whatsapp').href='https://wa.me/33667407214?text='+encodeURIComponent(subject+'\n\n'+body);
 review.querySelector('h4').focus();
}
const application=$('#application-form');if(application){
 const route=$('#app-route'),requested=params.get('parcours');if(['independant','projet','benevole','echanger'].includes(requested))route.value=requested;else route.value='echanger';
 application.addEventListener('submit',e=>{e.preventDefault();if(!application.reportValidity())return;
 const name=$('#app-name').value.trim(),email=$('#app-email').value.trim(),phone=$('#app-phone').value.trim(),message=$('#app-message').value.trim(),availability=$('#app-availability').value.trim();
 if(!name||!message)return;const label=route.options[route.selectedIndex].textContent;
 const body='Bonjour Form’Com,\n\nJe souhaite faire connaissance avec votre équipe.\n\nNom : '+name+'\nE-mail : '+email+(phone?'\nTéléphone : '+phone:'')+'\nParcours : '+label+'\n\n'+message+(availability?'\n\nDisponibilités : '+availability:'')+'\n\nÀ bientôt,\n'+name;
 prepare('application','Candidature Form’Com — '+label,body,name+', tu souhaites nous rejoindre pour : '+label.toLowerCase()+'. Choisis comment envoyer ta candidature.');
 });
 application.addEventListener('input',()=>{$('#application-review').hidden=true});application.addEventListener('change',()=>{$('#application-review').hidden=true});
}
const request=$('#request-form');if(request){
 const type=$('#request-type'),requested=params.get('demarche');if(['retrait','offrir','paiement','abonnement','retractation'].includes(requested))type.value=requested;
 const reference=params.get('reference');if(reference&&/^[a-zA-Z0-9_-]{1,160}$/.test(reference))$('#request-reference').value=reference;
 request.addEventListener('submit',e=>{e.preventDefault();if(!request.reportValidity())return;
 const name=$('#request-name').value.trim(),email=$('#request-email').value.trim(),ref=$('#request-reference').value.trim(),message=$('#request-message').value.trim();if(!name||!message)return;
 const label=type.options[type.selectedIndex].textContent;
 const body='Bonjour Form’Com,\n\nMa demande : '+label+'\n\nNom : '+name+'\nE-mail utilisé pour le paiement : '+email+(ref?'\nRéférence : '+ref:'')+'\n\n'+message+'\n\n'+name;
 prepare('request','Form’Com — '+label,body,'Votre demande concerne : '+label.toLowerCase()+'. Vérifiez vos informations puis envoyez le message.');
 });
 request.addEventListener('input',()=>{$('#request-review').hidden=true});request.addEventListener('change',()=>{$('#request-review').hidden=true});
}
})();
