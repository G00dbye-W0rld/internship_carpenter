# Application de Gestion des Stages en Menuiserie

Application web pour gérer les entreprises partenaires, les placements de stages et les retours d'expérience des élèves en menuiserie (CAP et Bac Pro).

## Description

Cette application permet aux professeurs et aux élèves de :

- Consulter la liste des entreprises partenaires
- Ajouter et gérer des entreprises (professeurs uniquement)
- Filtrer les entreprises par localisation, activités et statut
- Publier des avis et noter les entreprises après un stage
- Exporter les données en PDF, Excel ou via l'impression
- Suivre la moyenne des notes basée sur les retours d'expérience

## Fonctionnalités principales

**Pour les professeurs :**
- Ajouter, modifier et supprimer des entreprises
- Gérer les commentaires (publication et suppression)
- Exporter les listes d'entreprises
- Accès complet à toutes les fonctionnalités

**Pour les élèves :**
- Consulter les entreprises disponibles
- Filtrer par code postal, activités (Menuiserie, Pose, Charpente, etc.)
- Publier des avis après un stage
- Noter les entreprises (système de 1 à 5 étoiles)
- Exporter les données

**Système de notation :**
- Note calculée automatiquement (moyenne des avis)
- Affichage du nombre d'avis par entreprise
- Historique complet des commentaires avec timestamps

## Prérequis

Avant de commencer, vous devez avoir :

- Un compte GitHub
- Un compte Google (pour Firebase)
- Un compte Vercel (gratuit)
- Node.js installé sur votre ordinateur (optionnel, pour développement local)

## Installation

### Étape 1 : Dupliquer le projet

1. Connectez-vous à GitHub
2. Allez sur ce dépôt : `https://github.com/G00dbye-W0rld/internship_carpenter`
3. Cliquez sur "Fork" en haut à droite
4. Le projet est maintenant copié dans votre compte GitHub

### Étape 2 : Créer un projet Firebase

1. Allez sur https://console.firebase.google.com
2. Cliquez sur "Ajouter un projet"
3. Donnez un nom à votre projet (ex: "stages-menuiserie-lycee")
4. Désactivez Google Analytics (pas nécessaire)
5. Cliquez sur "Créer le projet"

### Étape 3 : Configurer Firebase Authentication

1. Dans la console Firebase, allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Activez "Adresse e-mail/Mot de passe"
4. Allez dans l'onglet "Users"
5. Créez les 2 comptes suivants :

**Compte Professeur :**
- Email : `prof@stages.local`
- Mot de passe : `prof123` (ou un mot de passe de votre choix)

**Compte Élève :**
- Email : `eleve@stages.local`
- Mot de passe : `eleve123` (ou un mot de passe de votre choix)

### Étape 4 : Configurer Firestore Database

1. Dans la console Firebase, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Démarrer en mode test" (nous changerons les règles après)
4. Choisissez un emplacement (ex: europe-west)

**Créer la collection "users" :**

1. Cliquez sur "Commencer une collection"
2. Nom de la collection : `users`
3. Créez 2 documents avec les informations suivantes :

**Document 1 (Professeur) :**
- ID du document : Copiez l'UID du compte `prof@stages.local` depuis Authentication
- Champs :
  - `email` (string) : `prof@stages.local`
  - `name` (string) : `Professeur`
  - `role` (string) : `teacher`

**Document 2 (Élève) :**
- ID du document : Copiez l'UID du compte `eleve@stages.local` depuis Authentication
- Champs :
  - `email` (string) : `eleve@stages.local`
  - `name` (string) : `Élève`
  - `role` (string) : `student`

### Étape 5 : Configurer les règles Firestore

1. Dans Firestore Database, allez dans l'onglet "Règles"
2. Remplacez tout le contenu par les règles suivantes :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isTeacher() {
      return request.auth != null && getUserRole() == 'teacher';
    }
    
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isTeacher();
      
      match /history/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow delete: if isTeacher();
        allow update: if false;
      }
    }
  }
}
```

3. Cliquez sur "Publier"

### Étape 6 : Récupérer la configuration Firebase

1. Dans la console Firebase, cliquez sur l'icône "roue dentée" puis "Paramètres du projet"
2. Descendez jusqu'à "Vos applications"
3. Cliquez sur l'icône Web `</>`
4. Donnez un nom à l'application (ex: "stages-menuiserie")
5. Cochez "Configurer Firebase Hosting" si proposé
6. Cliquez sur "Enregistrer l'application"
7. Copiez les informations de configuration (vous en aurez besoin plus tard)

Exemple de configuration :
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

### Étape 7 : Modifier la configuration dans le code

1. Allez dans votre dépôt GitHub forké
2. Ouvrez le fichier `src/firebase.js`
3. Cliquez sur l'icône "crayon" pour éditer
4. Remplacez la configuration Firebase par la vôtre (celle copiée à l'étape 6)
5. Cliquez sur "Commit changes"

### Étape 8 : Déployer sur Vercel

1. Allez sur https://vercel.com
2. Connectez-vous avec GitHub
3. Cliquez sur "Import Project"
4. Sélectionnez votre dépôt forké
5. Vercel détecte automatiquement React :
   - Framework Preset : Create React App
   - Build Command : `npm run build`
   - Output Directory : `build`
6. Cliquez sur "Deploy"
7. Attendez 2-3 minutes (premier build)
8. Votre application est en ligne !

### Étape 9 : Tester l'application

1. Cliquez sur le lien fourni par Vercel (ex: `votre-projet.vercel.app`)
2. Testez la connexion avec les 2 comptes :
   - Professeur : `prof` / `prof123`
   - Élève : `eleve` / `eleve123`

## Utilisation

### Connexion

L'application propose 2 types de comptes :

- **prof** : Accès complet (gestion entreprises + commentaires)
- **eleve** : Consultation + publication d'avis

### Ajouter une entreprise (professeur)

1. Connectez-vous avec le compte professeur
2. Cliquez sur "Ajouter"
3. Remplissez le formulaire :
   - Nom de l'entreprise (requis)
   - Adresse complète (requis)
   - Contact (optionnel)
   - Téléphone et email (optionnel)
   - Sélectionnez les activités (Menuiserie, Pose, Charpente, etc.)
   - Choisissez le statut (Accepte des stagiaires / N'accepte plus / Déconseillée)
4. Cliquez sur "Ajouter"

### Publier un avis

1. Connectez-vous (professeur ou élève)
2. Cliquez sur une entreprise
3. Cliquez sur "Ajouter un avis"
4. Rédigez votre commentaire
5. Attribuez une note (1 à 5 étoiles)
6. Cliquez sur "Publier"

La note moyenne de l'entreprise est automatiquement recalculée.

### Filtrer les entreprises

Utilisez les filtres disponibles :
- **Recherche** : Recherche par nom ou ville
- **Code postal** : Filtrer par code postal (ex: 74, 75)
- **Statut** : Accepte des stagiaires / N'accepte plus / Déconseillée
- **Activités** : Sélectionner un ou plusieurs tags

### Exporter les données

Cliquez sur "Exporter" puis choisissez :
- **Export PDF** : Tableau formaté
- **Export Excel** : Fichier .xlsx avec toutes les données
- **Imprimer** : Impression formatée

Les exports respectent les filtres actifs.

## Structure du projet

```
internship_carpenter/
├── public/
│   ├── index.html
│   └── ...
├── src/
│   ├── stage-menuiserie.jsx    # Composant principal
│   ├── firebase.js              # Configuration Firebase
│   ├── index.css                # Styles globaux
│   ├── index.js                 # Point d'entrée
│   └── ...
├── package.json
└── README.md
```

## Technologies utilisées

- **React** : Framework JavaScript pour l'interface
- **Firebase Authentication** : Gestion des comptes
- **Firestore** : Base de données en temps réel
- **Vercel** : Hébergement et déploiement automatique
- **Tailwind CSS** : Framework CSS pour le design
- **jsPDF** : Génération de PDF
- **xlsx** : Génération de fichiers Excel

## Mises à jour

Pour mettre à jour l'application après modification du code :

1. Modifiez les fichiers dans GitHub
2. Commitez les changements
3. Vercel déploie automatiquement la nouvelle version (2-3 minutes)

## Personnalisation

### Modifier les tags d'activités

Éditez le fichier `src/stage-menuiserie.jsx` et modifiez la constante `PREDEFINED_TAGS` :

```javascript
const PREDEFINED_TAGS = [
  { name: "Menuiserie", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { name: "Pose", color: "bg-green-100 text-green-800 border-green-300" },
  // Ajoutez vos propres tags ici
];
```

### Changer les identifiants de connexion

1. Modifiez les mots de passe dans Firebase Authentication
2. Mettez à jour la constante `GENERIC_ACCOUNTS` dans `src/stage-menuiserie.jsx`

### Ajouter des professeurs

Pour ajouter d'autres comptes professeurs :

**Option 1 : Compte partagé (recommandé)**
- Utilisez le compte `prof` existant
- Partagez les identifiants avec les autres professeurs

**Option 2 : Comptes individuels**
1. Créez de nouveaux comptes dans Firebase Authentication
2. Ajoutez les documents correspondants dans Firestore (collection `users`)
3. Attribuez le rôle `teacher`
4. Modifiez le code pour supporter plusieurs comptes

## Sécurité

- Les mots de passe sont gérés par Firebase (hachage sécurisé)
- Les règles Firestore empêchent les accès non autorisés
- Les élèves ne peuvent pas modifier ou supprimer les entreprises
- Les élèves ne peuvent pas supprimer les commentaires

## Sauvegarde des données

Les données sont stockées sur Firebase (serveurs Google) :
- Sauvegarde automatique
- Haute disponibilité
- Pas de risque de perte

Pour exporter toutes les données :
1. Utilisez la fonction "Export Excel"
2. Ou exportez directement depuis la console Firebase

## Résolution de problèmes

### Erreur "Permission denied"

Vérifiez que :
- Les règles Firestore sont correctement configurées
- Les comptes utilisateurs existent dans Authentication ET Firestore
- Les UIDs des documents correspondent aux UIDs d'Authentication

### Erreur "User not found"

Vérifiez que :
- Les 2 documents existent dans Firestore > collection `users`
- Les IDs des documents correspondent aux UIDs d'Authentication

### L'application ne charge pas

Vérifiez que :
- La configuration Firebase dans `src/firebase.js` est correcte
- Le projet Firebase est actif
- Vercel a bien déployé la dernière version

### Les commentaires ne s'affichent pas

Vérifiez les règles Firestore et rechargez la page (Ctrl + F5).

## Support

Pour toute question ou problème :
1. Vérifiez la section "Résolution de problèmes"
2. Consultez les logs dans la console du navigateur (F12)
3. Vérifiez les logs dans Firebase Console


## Licence

Ce projet est fourni à titre éducatif pour les établissements scolaires.


