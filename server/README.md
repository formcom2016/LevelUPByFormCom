# Raccordement Stripe du panier

Ce code est préparé et testé localement. Il n'est pas déployé. Les liens ponctuel,
5 €/mois et 10 €/mois existants restent distincts et fonctionnent indépendamment.

## Activation nécessaire

1. Déployer `stripe-worker.mjs` dans un Worker Cloudflare avec une liaison KV
   `ORDERS`. Aucun service Cloudflare n'a été créé par cette livraison.
2. Renseigner `SITE_ORIGIN=https://formcom2016.github.io`.
3. Dans le gestionnaire de secrets de l'hébergement, renseigner
   `STRIPE_SECRET_KEY` (d'abord une clé de test). Ne jamais la placer dans GitHub,
   le JavaScript public ou une conversation.
4. Créer dans Stripe un webhook vers `/webhook` pour les événements
   `checkout.session.completed` et `checkout.session.async_payment_succeeded`.
   Enregistrer son secret dans `STRIPE_WEBHOOK_SECRET` côté serveur.
5. Renseigner l'origine HTTPS du Worker dans `assets/config.js` : `checkoutApi`.
   Le bouton du panier passe alors de WhatsApp à Stripe.
6. Tester en mode test : remises, annulation, cadeau, confirmation, faux webhook,
   événements répétés, paiement différé. Puis activer les clés et webhook de
   production dans le compte Stripe et refaire un parcours contrôlé.

Le prix est recalculé côté serveur : la valeur envoyée par le navigateur n'est
jamais utilisée. Les parfums sont ceux du catalogue autorisé, 200 unités maximum.
Le serveur conserve la commande et confirme le paiement uniquement après un
événement Stripe signé, avec devise, montant et session concordants.

La page `merci.html` affiche une confirmation seulement après lecture de ce
statut serveur avec un jeton de suivi aléatoire. Une URL `success=true` ou un
montant envoyé par le navigateur ne confirme jamais un paiement.

## Ce qui n'est pas automatisé

- Les reçus par e-mail sont à activer/configurer dans Stripe.
- Les notifications de commande à l'équipe, le suivi des retraits et l'envoi
  d'accusés de réception de candidature restent à raccorder.
- Ce Worker ne remplace pas le suivi des anciens abonnements mensuels ni leur
  cumul. Leur portail client, résiliation électronique et factures récurrentes
  nécessitent une configuration distincte dans le compte Stripe.
- Le choix d'offrir les parfums est enregistré dans la commande ; leur
  distribution relève ensuite de l'association.
- L'accès de l'équipe aux commandes doit être organisé dans une interface
  authentifiée ou par export depuis Stripe/KV. Ne jamais exposer KV publiquement.
- Une politique de conservation des commandes doit être définie et appliquée
  avant la production ; aucune suppression comptable automatique n'est imposée.

## Ancien extrait Apps Script

Ne pas utiliser l'ancien récepteur Apps Script comme preuve de paiement : il
accepte des notifications sans vérifier leur signature et ne suit pas les
renouvellements via `invoice.paid`. Il ne peut pas servir de raccordement sûr au
nouveau panier. Ne pas transmettre ce nouveau webhook à l'ancien récepteur.
