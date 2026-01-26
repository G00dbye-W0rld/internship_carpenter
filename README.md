# 🏗️ Stages Menuiserie - Gestion des Entreprises Partenaires

Application web de gestion des entreprises accueillant nos élèves en stage de menuiserie.

## 📋 Fonctionnalités

### Pour les Professeurs
- ✅ Ajouter, modifier, supprimer des entreprises
- ✅ **Importer massivement depuis EcoleDirecte** (nouveau !)
- ✅ Consulter et supprimer tous les avis
- ✅ Exporter les données (PDF, Excel, Impression)
- ✅ Gérer les statuts des entreprises

### Pour les Élèves
- ✅ Consulter la liste des entreprises
- ✅ Filtrer par ville, code postal, activités
- ✅ Publier des avis et notes
- ✅ Consulter l'historique des stages

## 🆕 Import EcoleDirecte

### Comment utiliser l'import ?

1. **Exporter depuis EcoleDirecte**
   - Menu Stages → Entreprises
   - Exporter en Excel

2. **Importer dans l'application**
   - Connexion avec compte "prof"
   - Cliquer sur "Importer"
   - Sélectionner le fichier Excel
   - Vérifier l'aperçu
   - Valider l'import

3. **Résultat**
   - Entreprises ajoutées automatiquement
   - Tags détectés automatiquement (Menuiserie, Charpente, CAP, Bac Pro...)
   - Codes postaux extraits automatiquement
   - Évaluations converties en avis

### Format EcoleDirecte supporté

Colonnes attendues :
- **Nom** (obligatoire)
- **Adresse** (obligatoire - le code postal est extrait automatiquement)
- **Ville** (obligatoire)
- Secteur d'Activité (recommandé - détecte automatiquement les tags)
- Niveaux (recommandé - ajoute les tags CAP/Bac Pro)
- Téléphone
- Email
- Élèves
- Evaluation /5 (convertie en avis automatiquement)

### Mapping automatique

**Secteurs d'activité → Tags :**
- "Menuiserie" → Tag Menuiserie
- "Charpente" → Tag Charpente
- "Pose" → Tag Pose
- "Agencement" → Tag Agencement
- "Ébénisterie" → Tag Ébénisterie
- etc.

**Niveaux → Tags :**
- "CAP" → Tag CAP
- "Bac Pro" / "2nde" / "1ère" / "Terminale" → Tag Bac Pro

## 🚀 Accès à l'Application

**URL :** https://stages-menuiserie.vercel.app

**Identifiants :**
- Professeur : `prof` / `[mot de passe confidentiel]`
- Élève : `eleve` / `eleve123`

## 🎨 Fonctionnalités Principales

### 📊 Gestion des Entreprises
- Fiche complète avec coordonnées
- 11 tags d'activités colorés
- 3 statuts (Accepte / N'accepte plus / Déconseillée)
- Note moyenne calculée automatiquement

### 💬 Système d'Avis
- Professeurs et élèves peuvent laisser des avis
- Notes de 1 à 5 étoiles
- Historique complet avec dates
- Professeurs peuvent supprimer les avis

### 🔍 Filtres Avancés
- Recherche par nom ou ville
- Filtre par code postal
- Filtre par activités
- Filtre par statut

### 📤 Export de Données
- Export PDF professionnel
- Export Excel complet
- Impression optimisée

## 🛠️ Installation (pour autre établissement)

### Prérequis
- Compte GitHub
- Compte Google (pour Firebase)
- Compte Vercel

### Étapes d'installation

1. **Fork du projet GitHub**
   - Cliquer sur "Fork" en haut à droite

2. **Créer un projet Firebase**
   - Aller sur https://console.firebase.google.com
   - Créer un nouveau projet
   - Activer Authentication (Email/Password)
   - Activer Firestore Database

3. **Configurer Authentication**
   - Créer 2 utilisateurs :
     - `prof@stages.local` / `[votre mot de passe]`
     - `eleve@stages.local` / `eleve123`

4. **Créer la collection Firestore "users"**
   - Document 1 (UID du prof) :
     ```json
     {
       "email": "prof@stages.local",
       "name": "Professeur",
       "role": "teacher"
     }
     ```
   - Document 2 (UID de l'élève) :
     ```json
     {
       "email": "eleve@stages.local",
       "name": "Élève",
       "role": "student"
     }
     ```

5. **Configurer les règles Firestore**
   - Copier les règles depuis `FIRESTORE_RULES.txt`

6. **Récupérer la configuration Firebase**
   - Project Settings → General → Your apps → Web app
   - Copier la configuration

7. **Modifier le fichier `src/firebase.js`**
   - Coller votre configuration Firebase

8. **Déployer sur Vercel**
   - Connecter votre compte GitHub à Vercel
   - Importer le repository
   - Déployer

## 🔐 Sécurité

- Authentification Firebase requise
- Règles Firestore strictes
- Professeurs : accès complet
- Élèves : lecture + ajout d'avis uniquement

## 💾 Sauvegarde des Données

Les données sont stockées dans Firebase (Google Cloud) :
- Sauvegarde automatique
- Haute disponibilité
- Export possible à tout moment via l'application

## 🎯 Personnalisation

### Modifier les tags d'activités
Dans `src/stage-menuiserie.jsx`, ligne ~570 :
```javascript
const PREDEFINED_TAGS = [
  { name: "Menuiserie", color: "bg-blue-100 text-blue-800 border-blue-300" },
  // Ajouter vos tags personnalisés
];
```

### Modifier les identifiants
Dans `src/stage-menuiserie.jsx`, ligne ~135 :
```javascript
const GENERIC_ACCOUNTS = {
  'prof': {
    email: 'prof@stages.local',
    password: 'votre_mot_de_passe',
    // ...
  }
};
```

### Ajouter des professeurs
1. Créer un utilisateur dans Firebase Authentication
2. Ajouter un document dans Firestore "users" avec `role: "teacher"`
3. Ajouter l'identifiant dans `GENERIC_ACCOUNTS`

## 🆘 Résolution de Problèmes

### L'import ne fonctionne pas
- Vérifier le format du fichier Excel (colonnes correctes)
- Vérifier que les noms de colonnes sont exacts
- Vérifier les codes postaux dans les adresses

### Les avis ne s'enregistrent pas
- Vérifier les règles Firestore
- Vérifier que l'utilisateur est bien authentifié

### Export qui ne fonctionne pas
- Vérifier que le navigateur autorise les téléchargements
- Essayer avec un autre navigateur

## 📞 Support

Pour toute question ou amélioration, contacter l'administrateur de l'application.

## 🔄 Mises à Jour

L'application se met à jour automatiquement via GitHub et Vercel :
1. Modifier le code sur GitHub
2. Commit et push
3. Vercel déploie automatiquement (2-3 min)

## 🌟 Fonctionnalités Futures Possibles

- [ ] Détection automatique des doublons à l'import
- [ ] Mise à jour d'entreprises existantes via import
- [ ] Import depuis CSV/Google Sheets
- [ ] Notification par email des nouveaux avis
- [ ] Statistiques avancées
- [ ] Export PDF personnalisé avec logo

## 📊 Technologies Utilisées

- **Frontend :** React 18
- **Backend :** Firebase (Firestore + Authentication)
- **Hébergement :** Vercel
- **Styling :** Tailwind CSS
- **Icônes :** Font Awesome
- **Export :** jsPDF, xlsx
- **Import :** xlsx (parsing Excel)

## 📝 Licence

Application développée pour la gestion des stages menuiserie.

---

**Version :** 2.0 (avec import EcoleDirecte)  
**Dernière mise à jour :** Janvier 2026
