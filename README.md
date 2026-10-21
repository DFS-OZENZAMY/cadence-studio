# Cadence — studio vidéo pour tes clients

Crée des vidéos de marque de qualité professionnelle pour tes clients, de la charte graphique jusqu’au MP4 final, dans une seule plateforme.

## Ce que fait la plateforme

- **Clients et chartes graphiques** : logo, 4 couleurs (extraites automatiquement du logo), 5 typographies, 3 ambiances de fond. Chaque vidéo du client reprend sa charte.
- **6 modèles de vidéos** : lancement de produit, offre promotionnelle, témoignage client, présentation d’entreprise, résultats et chiffres, projet vierge.
- **9 scènes animées** : ouverture avec logo, titre choc (mots qui apparaissent un à un), chiffres clés (compteurs), points forts (liste cochée), témoignage, image plein écran (zoom lent), graphique en barres, étapes, appel à l’action.
- **Éditeur** : aperçu en direct, pellicule de scènes réorganisable par glisser-déposer, inspecteur, 5 transitions, annuler/rétablir, enregistrement automatique, raccourcis clavier.
- **4 formats** : 16:9 (YouTube), 9:16 (Reels, TikTok), 1:1 et 4:5 (feeds). Un clic pour passer de l’un à l’autre.
- **Export MP4** : de 720p à 4K, 30 ou 60 images/s, avec musique en option (fondu automatique), plusieurs formats en une fois.
- **Historique des exports**, accès protégé par mot de passe.

## Comment ça marche

Le rendu vidéo se fait **dans ton navigateur** grâce à WebCodecs, l’encodeur vidéo matériel de Chrome et Edge : pas de serveur de rendu, pas d’abonnement, pas de limite. Les MP4 sont en H.264, lisibles partout.
Cloudflare héberge l’application et stocke clients, projets et historique dans une base **D1**.

Navigateur conseillé pour l’export : **Google Chrome ou Microsoft Edge à jour** (Réglages → Compatibilité vérifie ton navigateur).

Bibliothèque tierce : [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (licence MIT, gratuite, embarquée dans `public/vendor/`).

## Déployer sur Cloudflare

1. Tableau de bord Cloudflare → **Workers & Pages** → **Create** → onglet **Workers** → **Import a repository**.
2. Choisis le dépôt `cadence-studio`, nomme le projet **`cadence-studio`**.
3. Commande de build vide, commande de déploiement `npx wrangler deploy`. Clique **Deploy**.

La base D1 `cadence-db` est créée automatiquement au premier déploiement, et les tables au premier appel.

**Sécurité au premier lancement** : la première personne qui ouvre le site choisit le mot de passe du studio. Ouvre-le tout de suite après le déploiement. Pour plus de sûreté, ajoute avant le premier lancement une variable `SETUP_CODE` (Worker → Settings → Variables and Secrets) : ce code sera demandé pour créer le studio.

## Développement local

```bash
npm install
npx wrangler dev        # http://localhost:8787 avec une base D1 locale
```

## Structure

```
public/
  index.html, styles.css   Interface
  app.js                   Écrans, éditeur, export
  engine.js                Moteur d’animation et d’encodage MP4
  vendor/mp4-muxer.mjs     Multiplexeur MP4 (MIT)
worker/index.js            API Cloudflare : accès, clients, projets, exports
wrangler.jsonc             Configuration Cloudflare (Worker + D1)
```

## Limites connues

- Un projet peut contenir jusqu’à environ 2 Mo d’images (elles sont compressées automatiquement).
- L’export utilise la puissance de l’ordinateur : une vidéo de 30 s en 1080p prend en général entre 15 et 60 secondes. Garde l’onglet ouvert pendant l’export.
