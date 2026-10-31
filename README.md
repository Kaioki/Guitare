# Le parcours guitare d’Albert

Application personnelle de guitare, adaptée de Parcours Jazz Piano, avec 416 blocs progressifs et le répertoire choisi par Albert.

## Utilisation

- Tronc commun : blocs 1 à 312, avec progression propre en pourcentage.
- Spécialisation : blocs 313 à 416, avec compteur indépendant.
- 32 modules, 57 titres (55 nouveaux titres souhaités et 2 déjà abordés).
- Séances de 30 minutes le samedi et le dimanche uniquement. Les cinq séances A à E d’un bloc se suivent sur plusieurs week-ends et se répètent jusqu’au feu vert.
- Édition complète des séances : date, durée, consignes, tempo, accompagnement, notes, réussites, obstacle, prochaine action, difficulté et confiance.
- Ajout de reprises optionnelles, validation, réouverture, suppression des séances ajoutées et retour au contenu guidé.
- Temps de pratique et total des séances terminées ; les reprises optionnelles n’augmentent pas le pourcentage de blocs maîtrisés.
- Recherche et filtres par bloc, module, étape et statut ; calendrier réel et bilans mensuels à huit critères.
- Référentiel guitare, registre des morceaux, sauvegarde/restauration JSON, impression et remise à zéro avec confirmation.

Les numéros désignent un ordre de maîtrise. Aucune date de fin n’est garantie, en particulier pour les transcriptions classiques avancées.

## Ouvrir sur GitHub Pages

La version prête à servir se trouve dans `docs/`. Elle utilise des chemins relatifs compatibles avec le sous-dossier du dépôt.

Dans GitHub, ouvrir **Settings → Pages**, choisir **Deploy from a branch**, puis **main** et **/docs**, et enregistrer. Le propriétaire du dépôt doit activer ce réglage si le compte contributeur n’en a pas le droit. GitHub affichera alors l’adresse officielle de l’application.

Dans Safari sur iPad, ouvrir cette adresse puis utiliser **Partager → Sur l’écran d’accueil**.

## Sauvegardes

Le suivi est enregistré dans le navigateur, sur l’appareil utilisé. Il ne s’enregistre pas dans le dépôt GitHub. Exporter régulièrement une sauvegarde JSON. Pour transférer le suivi de l’adresse OpenAI à GitHub Pages ou vers un autre appareil : exporter depuis l’ancienne adresse puis restaurer dans la nouvelle. Les sauvegardes des parcours piano sont refusées pour éviter les mélanges.

## Code et mise à jour

Le code modifiable est dans `app/`. `docs/` est sa version compilée ; ne pas la modifier à la main.

Node.js 22.13 ou plus récent est requis.

```sh
npm ci
npm test
npm run dev
```

Après une modification :

```sh
npm test
npm run build
```

Envoyer ensuite le code et le nouveau contenu de `docs/` dans le dépôt. GitHub Pages republiera la version compilée si la publication depuis `main /docs` est activée.

L’application fonctionne dans le navigateur sans serveur applicatif, compte supplémentaire ni clé d’API.
