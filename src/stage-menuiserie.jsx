import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, Star, MapPin, Tag, Edit2, Trash2, MessageSquare, Users, LogOut, Eye, EyeOff, X, Calendar, User, Mail, Phone, AlertCircle, Check } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword 
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

// =============================================================================
// FIREBASE SERVICE
// =============================================================================
const firebaseService = {
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error('Email ou mot de passe incorrect');
    }
  },
  
  async signOut() {
    await firebaseSignOut(auth);
  },
  
  getCurrentUser() {
    return auth.currentUser;
  },
  
  async getUserData(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },
  
  async getCompanies() {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const companies = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const company = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
          createdAt: docSnapshot.data().createdAt?.toDate(),
          updatedAt: docSnapshot.data().updatedAt?.toDate(),
          history: []
        };
        
        try {
          const historySnapshot = await getDocs(
            query(collection(db, `companies/${docSnapshot.id}/history`), orderBy('date', 'desc'))
          );
          company.history = historySnapshot.docs.map(h => ({
            id: h.id,
            ...h.data(),
            date: h.data().date?.toDate()
          }));
        } catch (e) {
          console.log('No history for company', company.id);
        }
        
        companies.push(company);
      }
      
      return companies;
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  },
  
  async addCompany(data) {
    const docRef = await addDoc(collection(db, 'companies'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...data };
  },
  
  async updateCompany(id, data) {
    await updateDoc(doc(db, 'companies', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  },
  
  async deleteCompany(id) {
    const historySnapshot = await getDocs(collection(db, `companies/${id}/history`));
    for (const historyDoc of historySnapshot.docs) {
      await deleteDoc(doc(db, `companies/${id}/history`, historyDoc.id));
    }
    await deleteDoc(doc(db, 'companies', id));
  },
  
  async addComment(companyId, comment) {
    await addDoc(collection(db, `companies/${companyId}/history`), {
      ...comment,
      date: serverTimestamp()
    });
  },
  
  async getUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  
  async addUser(userData) {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: serverTimestamp()
    });
    return { id: userCredential.user.uid, ...userData };
  },
  
  async deleteUser(uid) {
    await deleteDoc(doc(db, 'users', uid));
  },
  
  onSnapshot(callback) {
    const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async (snap) => {
      const companies = [];
      for (const docSnap of snap.docs) {
        const company = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate(),
          history: []
        };
        companies.push(company);
      }
      callback(companies);
    });
  }
};

const firebase = firebaseService;

// =============================================================================
// DONNÉES PRÉDÉFINIES
// =============================================================================
const PREDEFINED_TAGS = [
  "Menuiserie",
  "Pose",
  "Charpente",
  "Atelier",
  "Agencement",
  "Ébénisterie",
  "Escaliers",
  "Parquets",
  "Fenêtres/Portes"
];

const STATUS_OPTIONS = [
  { value: 'active', label: '✅ Accepte des stagiaires', color: '#10b981' },
  { value: 'inactive', label: '⚠️ N\'accepte plus', color: '#f59e0b' },
  { value: 'not-recommended', label: '❌ Déconseillée', color: '#ef4444' }
];

// =============================================================================
// COMPOSANTS UI RÉUTILISABLES
// =============================================================================

const Button = ({ children, variant = 'primary', icon: Icon, onClick, disabled, type = 'button', className = '' }) => {
  const variants = {
    primary: 'bg-amber-600 hover:bg-amber-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />}
      <input
        className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} border-2 rounded-lg focus:outline-none focus:border-amber-500 transition-colors ${error ? 'border-red-500' : 'border-slate-200'}`}
        {...props}
      />
    </div>
    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
  </div>
);

const Select = ({ label, options, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
    <select
      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-amber-500 transition-colors ${error ? 'border-red-500' : 'border-slate-200'}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
  </div>
);

const Textarea = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
    <textarea
      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-amber-500 transition-colors ${error ? 'border-red-500' : 'border-slate-200'}`}
      rows={4}
      {...props}
    />
    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const StarRating = ({ rating, onRate, readonly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRate && onRate(star)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            size={24}
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
};

const TagSelector = ({ selectedTags, onToggle, readonly = false }) => (
  <div className="flex flex-wrap gap-2">
    {PREDEFINED_TAGS.map(tag => {
      const isSelected = selectedTags.includes(tag);
      return (
        <button
          key={tag}
          type="button"
          onClick={() => !readonly && onToggle(tag)}
          disabled={readonly}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isSelected
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Tag size={14} className="inline mr-1" />
          {tag}
        </button>
      );
    })}
  </div>
);

// =============================================================================
// PAGE DE CONNEXION
// =============================================================================
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await firebase.signIn(email, password);
      const userData = await firebase.getUserData(user.uid);
      
      if (!userData) {
        throw new Error('Utilisateur non trouvé dans la base de données');
      }
      
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slideUp">
        <div className="text-center mb-8">
          <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={40} className="text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Stages Menuiserie</h1>
          <p className="text-slate-600">Base de données des entreprises</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre.email@lycee.fr"
            required
          />

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// GESTION DES UTILISATEURS (Admin uniquement)
// =============================================================================
const UserManagement = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'teacher'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await firebase.getUsers();
    setUsers(data);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    await firebase.addUser(newUser);
    setNewUser({ email: '', password: '', name: '', role: 'teacher' });
    setShowAddUser(false);
    loadUsers();
  };

  const handleDeleteUser = async (uid) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      await firebase.deleteUser(uid);
      loadUsers();
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Gestion des Utilisateurs">
      <div className="mb-6">
        <Button icon={Plus} onClick={() => setShowAddUser(!showAddUser)}>
          Ajouter un utilisateur
        </Button>
      </div>

      {showAddUser && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Nouvel Utilisateur</h3>
          <Input
            label="Nom complet"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <Select
            label="Rôle"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            options={[
              { value: 'teacher', label: '👨‍🏫 Professeur' },
              { value: 'student', label: '👨‍🎓 Élève' }
            ]}
          />
          <Button type="submit" icon={Check}>Créer l'utilisateur</Button>
        </form>
      )}

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-600">{user.email}</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {user.role === 'admin' ? '👨‍💼 Admin' : user.role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'}
              </span>
            </div>
            {user.id !== currentUser.id && (
              <Button variant="danger" icon={Trash2} onClick={() => handleDeleteUser(user.id)}>
                Supprimer
              </Button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

// =============================================================================
// FORMULAIRE ENTREPRISE
// =============================================================================
const CompanyForm = ({ company, onSave, onCancel, currentUser }) => {
  const [formData, setFormData] = useState(company || {
    name: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    contactName: '',
    tags: [],
    status: 'active',
    rating: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, createdBy: currentUser.id });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Nom de l'entreprise *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Nom du contact"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
        />
      </div>

      <Input
        label="Adresse *"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        required
      />

      <div className="grid md:grid-cols-3 gap-4">
        <Input
          label="Code postal *"
          value={formData.postalCode}
          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
          required
        />
        <Input
          label="Ville *"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
          className="md:col-span-2"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Téléphone"
          type="tel"
          icon={Phone}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          icon={Mail}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Activités / Spécialités *</label>
        <TagSelector selectedTags={formData.tags} onToggle={toggleTag} />
      </div>

      <Select
        label="Statut *"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        options={STATUS_OPTIONS}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Évaluation</label>
        <StarRating rating={formData.rating} onRate={(rating) => setFormData({ ...formData, rating })} />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" icon={Check}>
          {company ? 'Enregistrer les modifications' : 'Ajouter l\'entreprise'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

// =============================================================================
// DÉTAIL ENTREPRISE
// =============================================================================
const CompanyDetail = ({ company, onClose, onEdit, onDelete, currentUser }) => {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState('');
  const [commentRating, setCommentRating] = useState(3);

  const canEdit = currentUser.role === 'teacher' || currentUser.role === 'admin';

  const statusInfo = STATUS_OPTIONS.find(s => s.value === company.status);

  const handleAddComment = async (e) => {
    e.preventDefault();
    await firebase.addComment(company.id, {
      comment,
      rating: commentRating,
      authorId: currentUser.id,
      authorName: currentUser.name
    });
    setComment('');
    setCommentRating(3);
    setShowCommentForm(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={company.name}>
      <div className="space-y-6">
        {/* En-tête avec statut et évaluation */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span
              className="inline-block px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>
          <StarRating rating={company.rating} readonly />
        </div>

        {/* Informations */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Adresse</p>
            <p className="font-medium flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              {company.address}, {company.postalCode} {company.city}
            </p>
          </div>
          {company.contactName && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Contact</p>
              <p className="font-medium flex items-center gap-2">
                <User size={16} className="text-slate-400" />
                {company.contactName}
              </p>
            </div>
          )}
          {company.phone && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Téléphone</p>
              <p className="font-medium flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                {company.phone}
              </p>
            </div>
          )}
          {company.email && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Email</p>
              <p className="font-medium flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {company.email}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <p className="text-sm text-slate-500 mb-2">Activités</p>
          <TagSelector selectedTags={company.tags} readonly />
        </div>

        {/* Historique */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={20} />
              Historique ({company.history?.length || 0})
            </h3>
            {canEdit && (
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                Ajouter
              </Button>
            )}
          </div>

          {showCommentForm && (
            <form onSubmit={handleAddComment} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <Textarea
                label="Commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Expérience avec cette entreprise..."
                required
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                <StarRating rating={commentRating} onRate={setCommentRating} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" icon={Check}>Publier</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCommentForm(false)}>Annuler</Button>
              </div>
            </form>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {company.history?.length === 0 && (
              <p className="text-slate-500 text-center py-4">Aucun commentaire pour le moment</p>
            )}
            {company.history?.map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{item.authorName}</span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(item.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <StarRating rating={item.rating} readonly />
                <p className="text-slate-700 mt-2">{item.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button icon={Edit2} onClick={onEdit}>Modifier</Button>
            <Button variant="danger" icon={Trash2} onClick={onDelete}>Supprimer</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// =============================================================================
// CARTE ENTREPRISE
// =============================================================================
const CompanyCard = ({ company, onClick }) => {
  const statusInfo = STATUS_OPTIONS.find(s => s.value === company.status);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-2 border-transparent hover:border-amber-200 group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
            {company.name}
          </h3>
          <StarRating rating={company.rating} readonly />
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-slate-600 flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            {company.postalCode} {company.city}
          </p>
          {company.contactName && (
            <p className="text-slate-600 flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              {company.contactName}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {company.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
              {tag}
            </span>
          ))}
          {company.tags.length > 3 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              +{company.tags.length - 3}
            </span>
          )}
        </div>

        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// APPLICATION PRINCIPALE
// =============================================================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [postalCodeFilter, setPostalCodeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const unsubscribe = firebase.onSnapshot(data => {
        setCompanies(data);
      });
      return unsubscribe;
    }
  }, [currentUser]);

  useEffect(() => {
    let filtered = companies;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(c =>
        selectedTags.some(tag => c.tags.includes(tag))
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    if (postalCodeFilter) {
      filtered = filtered.filter(c =>
        c.postalCode.startsWith(postalCodeFilter)
      );
    }

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, selectedTags, selectedStatus, postalCodeFilter]);

  const handleSaveCompany = async (companyData) => {
    if (editingCompany) {
      await firebase.updateCompany(editingCompany.id, companyData);
      setEditingCompany(null);
    } else {
      await firebase.addCompany(companyData);
      setShowAddForm(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      await firebase.deleteCompany(selectedCompany.id);
      setSelectedCompany(null);
    }
  };

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const canEdit = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-3 rounded-xl">
                <Building2 size={32} className="text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Stages Menuiserie</h1>
                <p className="text-sm text-slate-600">{companies.length} entreprises</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="font-semibold text-slate-900">{currentUser.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  currentUser.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  currentUser.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {currentUser.role === 'admin' ? '👨‍💼 Admin' : currentUser.role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'}
                </span>
              </div>

              {currentUser.role === 'admin' && (
                <Button variant="secondary" icon={Users} onClick={() => setShowUserManagement(true)}>
                  Utilisateurs
                </Button>
              )}

              <Button variant="ghost" icon={LogOut} onClick={() => setCurrentUser(null)}>
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher une entreprise ou une ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtres {(selectedTags.length > 0 || selectedStatus !== 'all' || postalCodeFilter) && `(${selectedTags.length + (selectedStatus !== 'all' ? 1 : 0) + (postalCodeFilter ? 1 : 0)})`}
              </Button>

              {canEdit && (
                <Button icon={Plus} onClick={() => setShowAddForm(true)}>
                  Ajouter une entreprise
                </Button>
              )}
            </div>
          </div>

          {/* Panneau de filtres */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-200 animate-slideDown">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code postal</label>
                  <input
                    type="text"
                    placeholder="75, 69, etc."
                    value={postalCodeFilter}
                    onChange={(e) => setPostalCodeFilter(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Activités</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(selectedTags.length > 0 || selectedStatus !== 'all' || postalCodeFilter) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedTags([]);
                      setSelectedStatus('all');
                      setPostalCodeFilter('');
                    }}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Liste des entreprises */}
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">Aucune entreprise trouvée</p>
            {canEdit && (
              <Button icon={Plus} onClick={() => setShowAddForm(true)} className="mt-4 mx-auto">
                Ajouter la première entreprise
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => setSelectedCompany(company)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddForm && (
        <Modal isOpen={true} onClose={() => setShowAddForm(false)} title="Nouvelle Entreprise">
          <CompanyForm
            onSave={handleSaveCompany}
            onCancel={() => setShowAddForm(false)}
            currentUser={currentUser}
          />
        </Modal>
      )}

      {editingCompany && (
        <Modal isOpen={true} onClose={() => setEditingCompany(null)} title="Modifier l'Entreprise">
          <CompanyForm
            company={editingCompany}
            onSave={handleSaveCompany}
            onCancel={() => setEditingCompany(null)}
            currentUser={currentUser}
          />
        </Modal>
      )}

      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onEdit={() => {
            setEditingCompany(selectedCompany);
            setSelectedCompany(null);
          }}
          onDelete={handleDeleteCompany}
          currentUser={currentUser}
        />
      )}

      {showUserManagement && (
        <UserManagement
          currentUser={currentUser}
          onClose={() => setShowUserManagement(false)}
        />
      )}

      {/* Styles d'animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
