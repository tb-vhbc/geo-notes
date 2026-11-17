# GeoNotes

<img src="src/preview.png" alt="GeoNotes" width="96" align="right">

Extension pour **GEO** qui ajoute dans l'en-tête de l'application un petit tableau de tâches personnel (façon kanban) :

- **À faire** → **En cours** → **Réalisé**
- ajout d'une tâche multi-ligne (`Ctrl+Entrée` pour valider) ;
- extrait sur 2 lignes, texte complet affiché au clic ;
- passage d'une colonne à l'autre, remise en cours, suppression ;
- sauvegarde dans le `localStorage` du navigateur, synchronisée entre les onglets ouverts.

> Les tâches sont stockées localement dans le navigateur : elles ne sont ni partagées entre utilisateurs ni entre postes.

## Installation

1. Télécharger `GeoNotes-<version>.zip` depuis la page [Releases](../../releases).
2. Dans l'administration GEO, importer le zip comme nouvelle extension (ou mettre à jour l'extension existante).
3. Activer l'extension dans l'application souhaitée.

Version minimale de GEO : **3.0.0**.

## Développement

### Prérequis

- Node.js 18+ (utilise `fetch` natif)

```bash
npm install
```

### Structure

| Fichier | Rôle |
| --- | --- |
| `src/plugin.geoext.json` | Définition de l'extension (nom, version, dépendances, aperçu) |
| `src/main.js` | Code de l'extension (module Angular `GeoNotes`) |
| `src/preview.png` | Image d'aperçu affichée dans GEO |
| `webpack.config.js` | Copie `src/` et produit `dist/<name>-<version>.zip` |
| `geo-publish-extension.js` | Plugin webpack qui publie le zip sur GEO |
| `GeoExtensionPublish.js` | Client de l'API GEO (authentification, création / mise à jour) |

### Scripts

| Commande | Description |
| --- | --- |
| `npm run build` | Construit `dist/GeoNotes-<version>.zip` |
| `npm run watch` | Reconstruit à chaque modification |
| `npm run geo:publish` | Construit puis publie l'extension sur GEO |
| `npm run geo:watch` | Reconstruit et republie à chaque modification |

### Publication directe sur GEO

Créer un fichier `.env` à la racine (non versionné) :

```ini
GEO_SERVER=https://geo.example.fr
GEO_CLIENT_ID=...
GEO_SECRET=...
# ou, à la place du couple client/secret :
# GEO_ACCESS_TOKEN=...
# Désactive la vérification TLS (certificat auto-signé uniquement)
# GEO_INSECURE=true
```

Puis `npm run geo:publish`. L'extension est créée si elle n'existe pas, sinon mise à jour.

## Publier une release

1. Incrémenter `version` dans `src/plugin.geoext.json` (et `package.json`).
2. Committer, puis créer et pousser le tag correspondant :

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. Le workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) construit le zip et l'attache automatiquement à la release GitHub.
