// =============================================================================
// FIREBASE SERVICE - Remplace le FirebaseMock
// src/firebaseService.js
// =============================================================================

import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

class FirebaseService {
  constructor() {
    this.listeners = [];
  }

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  /**
   * Connexion avec email et mot de passe
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Déconnexion
   */
  async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'utilisateur actuellement connecté
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Récupérer les données utilisateur depuis Firestore
   */
  async getUserData(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur de récupération utilisateur:', error);
      throw error;
    }
  }

  /**
   * Écouter les changements d'état d'authentification
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // =============================================================================
  // COMPANIES (ENTREPRISES)
  // =============================================================================

  /**
   * Récupérer toutes les entreprises
   */
  async getCompanies() {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const companies = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const companyData = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            createdAt: docSnapshot.data().createdAt?.toDate(),
            updatedAt: docSnapshot.data().updatedAt?.toDate()
          };

          // Récupérer l'historique (sous-collection)
          const historySnapshot = await getDocs(
            query(
              collection(db, `companies/${docSnapshot.id}/history`),
              orderBy('date', 'desc')
            )
          );
          
          companyData.history = historySnapshot.docs.map(historyDoc => ({
            id: historyDoc.id,
            ...historyDoc.data(),
            date: historyDoc.data().date?.toDate()
          }));

          return companyData;
        })
      );

      return companies;
    } catch (error) {
      console.error('Erreur de récupération des entreprises:', error);
      throw error;
    }
  }

  /**
   * Récupérer une entreprise spécifique
   */
  async getCompany(id) {
    try {
      const docRef = doc(db, 'companies', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const companyData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate()
        };

        // Récupérer l'historique
        const historySnapshot = await getDocs(
          query(
            collection(db, `companies/${id}/history`),
            orderBy('date', 'desc')
          )
        );
        
        companyData.history = historySnapshot.docs.map(historyDoc => ({
          id: historyDoc.id,
          ...historyDoc.data(),
          date: historyDoc.data().date?.toDate()
        }));

        return companyData;
      }
      return null;
    } catch (error) {
      console.error('Erreur de récupération entreprise:', error);
      throw error;
    }
  }

  /**
   * Ajouter une nouvelle entreprise
   */
  async addCompany(data) {
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Erreur d\'ajout entreprise:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une entreprise
   */
  async updateCompany(id, data) {
    try {
      const docRef = doc(db, 'companies', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur de mise à jour entreprise:', error);
      throw error;
    }
  }

  /**
   * Supprimer une entreprise
   */
  async deleteCompany(id) {
    try {
      // Supprimer d'abord tous les commentaires (sous-collection)
      const historySnapshot = await getDocs(
        collection(db, `companies/${id}/history`)
      );
      
      const deletePromises = historySnapshot.docs.map(historyDoc =>
        deleteDoc(doc(db, `companies/${id}/history`, historyDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Puis supprimer l'entreprise
      await deleteDoc(doc(db, 'companies', id));
    } catch (error) {
      console.error('Erreur de suppression entreprise:', error);
      throw error;
    }
  }

  /**
   * Ajouter un commentaire à l'historique d'une entreprise
   */
  async addComment(companyId, comment) {
    try {
      const historyRef = collection(db, `companies/${companyId}/history`);
      await addDoc(historyRef, {
        ...comment,
        date: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur d\'ajout de commentaire:', error);
      throw error;
    }
  }

  /**
   * Écouter les changements en temps réel sur les entreprises
   */
  onSnapshot(callback) {
    const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, async (querySnapshot) => {
      try {
        const companies = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const companyData = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
              createdAt: docSnapshot.data().createdAt?.toDate(),
              updatedAt: docSnapshot.data().updatedAt?.toDate()
            };

            // Récupérer l'historique
            const historySnapshot = await getDocs(
              query(
                collection(db, `companies/${docSnapshot.id}/history`),
                orderBy('date', 'desc')
              )
            );
            
            companyData.history = historySnapshot.docs.map(historyDoc => ({
              id: historyDoc.id,
              ...historyDoc.data(),
              date: historyDoc.data().date?.toDate()
            }));

            return companyData;
          })
        );

        callback(companies);
      } catch (error) {
        console.error('Erreur dans onSnapshot:', error);
      }
    }, (error) => {
      console.error('Erreur de listener:', error);
    });
  }

  // =============================================================================
  // USERS (UTILISATEURS)
  // =============================================================================

  /**
   * Récupérer tous les utilisateurs
   */
  async getUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Erreur de récupération utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Créer un nouvel utilisateur (Admin uniquement)
   * Note: Pour créer un utilisateur avec Authentication ET Firestore,
   * il faudrait idéalement utiliser Firebase Admin SDK côté serveur.
   * Cette méthode crée uniquement le document Firestore.
   */
  async addUser(userData) {
    try {
      // Créer l'utilisateur dans Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      // Créer le document dans Firestore avec l'UID généré
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        createdAt: serverTimestamp()
      });

      return {
        id: userCredential.user.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role
      };
    } catch (error) {
      console.error('Erreur de création utilisateur:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Supprimer un utilisateur
   * Note: Supprime uniquement le document Firestore.
   * Pour supprimer de Authentication, il faut Firebase Admin SDK.
   */
  async deleteUser(uid) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Erreur de suppression utilisateur:', error);
      throw error;
    }
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  /**
   * Traduire les codes d'erreur Firebase en messages français
   */
  getErrorMessage(errorCode) {
    const errors = {
      'auth/invalid-email': 'Email invalide',
      'auth/user-disabled': 'Ce compte a été désactivé',
      'auth/user-not-found': 'Aucun compte trouvé avec cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
      'auth/network-request-failed': 'Erreur de connexion réseau',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
      'permission-denied': 'Permissions insuffisantes'
    };

    return errors[errorCode] || 'Une erreur est survenue';
  }
}

// Créer et exporter une instance unique
const firebaseService = new FirebaseService();
export default firebaseService;
