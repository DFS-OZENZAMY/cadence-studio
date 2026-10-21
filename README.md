# Cadence — studio vidéo pour tes clients

Crée des vidéos de marque de qualité professionnelle pour tes clients, de la charte graphique jusqu’au MP4 final, dans une seule plateforme.

## Ce que fait la plateforme

- **Clients et chartes graphiques** : logo, 4 couleurs (extraites automatiquement du logo), 5 typographies, 3 ambiances de fond. Chaque vidéo du client reprend sa charte.
- **33 modèles de vidéos, classés en 13 secteurs** : restauration, immobilier, beauté et bien-être, sport et coaching, e-commerce et mode, formation, santé, tech et SaaS, événementiel, artisans et BTP, finance et assurance, tourisme et hôtellerie, automobile, plus les modèles généraux.
- **14 scènes animées** : ouverture avec logo, titre choc, chiffres clés, points forts, témoignage, image plein écran, graphique, étapes, appel à l’action, présentateur, offre et prix (prix barré, badge), avant / après (volet glissant), fiche (bien, produit, véhicule) et événement (calendrier animé).
- **Polices et tailles réglables** pendant l’édition : 19 polices (sans-serif, serif, géométriques, impact, manuscrites), une police pour les titres et une pour le texte, tailles de 50 % à 180 %, réglables pour toute la vidéo ou scène par scène.
- **Éditeur** : aperçu en direct, pellicule de scènes réorganisable par glisser-déposer, inspecteur, 5 transitions, annuler/rétablir, enregistrement automatique, raccourcis clavier.
- **4 formats** : 16:9 (YouTube), 9:16 (Reels, TikTok), 1:1 et 4:5 (feeds). Un clic pour passer de l’un à l’autre.
- **Export MP4** : de 720p à 4K, 30 ou 60 images/s, avec musique en option (fondu automatique), plusieurs formats en une fois.
- **Avatars présentateurs** :
  - **Personnages cartoon, gratuits et illimités** : une galerie de 16 personnages prêts à l’emploi (sélection multiple), et un personnalisateur complet. 5 espèces (humain, robot, chat, renard, ours), 3 styles de dessin (classique, mascotte, contour BD), forme du visage, yeux, sourcils, nez, bouche, 11 coiffures, 5 tenues (couleurs du client ou au choix), lunettes, casquette, bonnet, casque audio, barbes, et un bouton « Aléatoire ». Ils respirent, clignent des yeux, bougent la tête, gesticulent, et leur bouche suit la voix.
  - **Réalistes par IA, en option** : une photo devient une personne qui parle (Kling Avatar v2 via fal.ai, environ 0,056 $ par seconde en Standard, 0,115 $ en Pro).
- **Voix** :
  - **voix gratuites et illimitées à partir du texte**, calculées dans le navigateur (Piper) : Siwis et Jessica (féminines), Pierre et Gilles (masculines), vitesse réglable. La voix se télécharge une seule fois (27 à 74 Mo), ensuite la génération prend quelques secondes ;
  - enregistrement au micro directement dans l’éditeur, ou import d’un fichier audio ;
  - voix IA premium en option (ElevenLabs via fal.ai, environ 0,10 $ pour 1 000 caractères).
- **Scène Présentateur** : avatar à côté du contenu, en médaillon ou plein cadre ; les points s’affichent au fil de la voix ; sous-titres synchronisés ; durée calée automatiquement sur la voix.
- **Mixage audio** à l’export : voix + musique, la musique baisse automatiquement quand l’avatar parle.
- **Suivi des coûts IA** : estimation avant chaque génération et total du mois dans les Réglages.
- **Historique des exports**, accès protégé par mot de passe.

## Comment ça marche

Le rendu vidéo se fait **dans ton navigateur** grâce à WebCodecs, l’encodeur vidéo matériel de Chrome et Edge : pas de serveur de rendu, pas d’abonnement, pas de limite. Les MP4 sont en H.264, lisibles partout.
Cloudflare héberge l’application et stocke clients, projets et historique dans une base **D1**.

Navigateur conseillé pour l’export : **Google Chrome ou Microsoft Edge à jour** (Réglages → Compatibilité vérifie ton navigateur).

Voix gratuites : [Piper](https://github.com/rhasspy/piper) via [@mintplex-labs/piper-tts-web](https://github.com/Mintplex-Labs/piper-tts-web) et onnxruntime-web (licences MIT), embarqués dans `public/vendor/`. Les modèles de voix sont téléchargés depuis Hugging Face par le Worker (route `/voix-piper/`), mis en cache par Cloudflare puis par le navigateur. Licences des voix : Siwis CC BY 4.0, UPMC (Jessica, Pierre) CC BY-SA 4.0, Gilles CC0. Pour Siwis et UPMC, mentionne la source (par exemple dans la description de la vidéo). Détails dans `public/vendor/piper/LICENCES.txt`.

Bibliothèque tierce : [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (licence MIT, gratuite, embarquée dans `public/vendor/`).

## Déployer sur Cloudflare

1. Tableau de bord Cloudflare → **Workers & Pages** → **Create** → onglet **Workers** → **Import a repository**.
2. Choisis le dépôt `cadence-studio`, nomme le projet **`cadence-studio`**.
3. Commande de build vide, commande de déploiement `npx wrangler deploy`. Clique **Deploy**.

La base D1 `cadence-db` est créée automatiquement au premier déploiement, et les tables au premier appel.

**Avatars réalistes et voix IA (facultatif)** : crée une clé sur fal.ai (rubrique API Keys), puis ajoute-la soit dans Cadence (Réglages → Intelligence artificielle), soit, plus sûr, comme secret `FAL_KEY` du Worker (Settings → Variables and Secrets → Secret). Les générations sont facturées par fal.ai.

**Sécurité au premier lancement** : la première personne qui ouvre le site choisit le mot de passe du studio. Ouvre-le tout de suite après le déploiement. Pour plus de sûreté, ajoute avant le premier lancement une variable `SETUP_CODE` (Worker → Settings → Variables and Secrets) : ce code sera demandé pour créer le studio.

## Développement local

```bash
npm install
npx wrangler dev        # http://localhost:8787 avec une base D1 locale
```

Pour tester le circuit IA sans dépenser, la variable `FAL_BASE` permet de pointer vers un serveur qui imite l’API de file d’attente de fal.ai :
`npx wrangler dev --var FAL_BASE:http://localhost:9999 --var FAL_KEY:cle_de_test_quelconque_123`

## Structure

```
public/
  index.html, styles.css   Interface
  app.js                   Écrans, éditeur, export
  engine.js                Moteur d’animation, mixage audio et encodage MP4
  avatar.js                Personnages cartoon animés et galerie
  vendor/mp4-muxer.mjs     Multiplexeur MP4 (MIT)
worker/index.js            API Cloudflare : accès, clients, projets, avatars, médias, IA, exports
wrangler.jsonc             Configuration Cloudflare (Worker + D1)
```

## Limites connues

- Un projet peut contenir jusqu’à environ 2 Mo d’images (elles sont compressées automatiquement). Les voix, photos d’avatars et vidéos IA sont stockées à part (60 Mo maximum par fichier).
- La génération d’un avatar réaliste prend souvent 3 à 10 minutes. Elle continue même si tu fermes l’éditeur ; le résultat apparaît à ta prochaine ouverture du projet.
- Utilise uniquement des photos et des voix de personnes qui ont donné leur accord.
- L’export utilise la puissance de l’ordinateur : une vidéo de 30 s en 1080p prend en général entre 15 et 60 secondes. Garde l’onglet ouvert pendant l’export.
