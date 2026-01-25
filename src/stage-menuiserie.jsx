import React, { useState, useEffect } from 'react';
import { 
  FaBuilding,
  FaPlus,
  FaSearch,
  FaFilter,
  FaStar,
  FaRegStar,
  FaMapMarkerAlt,
  FaTag,
  FaEdit,
  FaTrash,
  FaComments,
  FaUsers,
  FaSignOutAlt,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaCalendar,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaExclamationCircle,
  FaCheck,
  FaFileExport,
  FaFilePdf,
  FaFileExcel,
  FaPrint
} from 'react-icons/fa';

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
// FONCTIONS D'EXPORT
// =============================================================================

const exportToPDF = async (companies, filename = 'entreprises-stages.pdf') => {
  const jsPDF = (await import('jspdf')).jsPDF;
  await import('jspdf-autotable');
  
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Liste des Entreprises - Stages Menuiserie', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);
  
  const tableData = companies.map(c => [
    c.name,
    `${c.postalCode} ${c.city}`,
    c.contactName || '-',
    c.phone || '-',
    c.tags.join(', '),
    c.status === 'active' ? 'Actif' : c.status === 'inactive' ? 'Inactif' : 'Déconseillée',
    '★'.repeat(c.rating)
  ]);
  
  doc.autoTable({
    startY: 35,
    head: [['Entreprise', 'Localisation', 'Contact', 'Téléphone', 'Activités', 'Statut', 'Note']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 35 }
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(filename);
};

const exportToExcel = async (companies, filename = 'entreprises-stages.xlsx') => {
  const XLSX = await import('xlsx');
  
  const worksheet = XLSX.utils.json_to_sheet(
    companies.map(c => ({
      'Entreprise': c.name,
      'Adresse': c.address,
      'Code Postal': c.postalCode,
      'Ville': c.city,
      'Contact': c.contactName || '',
      'Téléphone': c.phone || '',
      'Email': c.email || '',
      'Activités': c.tags.join(', '),
      'Statut': c.status === 'active' ? 'Accepte des stagiaires' : 
                c.status === 'inactive' ? 'N\'accepte plus' : 'Déconseillée',
      'Note': c.rating,
      'Commentaires': c.history?.length || 0
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entreprises');
  
  worksheet['!cols'] = [
    { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 35 },
    { wch: 25 }, { wch: 8 }, { wch: 15 }
  ];
  
  XLSX.writeFile(workbook, filename);
};

const printCompanies = (companies) => {
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Liste des Entreprises - Stages Menuiserie</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #000; }
        h1 { text-align: center; color: #0F172A; font-size: 20pt; margin-bottom: 10px; border-bottom: 2px solid #0F172A; padding-bottom: 10px; }
        .subtitle { text-align: center; color: #64748B; margin-bottom: 20px; font-size: 10pt; }
        .company-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 15px; page-break-inside: avoid; }
        .company-header { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
        .company-name { font-size: 13pt; font-weight: bold; color: #0F172A; }
        .rating { color: #F59E0B; }
        .info-row { margin-bottom: 4px; font-size: 10pt; }
        .info-label { font-weight: 600; color: #475569; margin-right: 8px; }
        .tags { margin-top: 8px; }
        .tag { display: inline-block; background: #E0E7FF; color: #3730A3; padding: 2px 8px; border-radius: 4px; font-size: 9pt; margin-right: 4px; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; margin-top: 8px; }
        .status-active { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
        .status-inactive { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
        .status-danger { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }
      </style>
    </head>
    <body>
      <h1>Liste des Entreprises</h1>
      <p class="subtitle">Stages Menuiserie - ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${companies.map(c => `
        <div class="company-card">
          <div class="company-header">
            <div class="company-name">${c.name}</div>
            <div class="rating">${'★'.repeat(c.rating)}</div>
          </div>
          <div class="info-row"><span class="info-label">Adresse:</span>${c.address}, ${c.postalCode} ${c.city}</div>
          ${c.contactName ? `<div class="info-row"><span class="info-label">Contact:</span>${c.contactName}</div>` : ''}
          ${c.phone ? `<div class="info-row"><span class="info-label">Téléphone:</span>${c.phone}</div>` : ''}
          ${c.email ? `<div class="info-row"><span class="info-label">Email:</span>${c.email}</div>` : ''}
          <div class="tags">${c.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
          <div class="status status-${c.status === 'active' ? 'active' : c.status === 'inactive' ? 'inactive' : 'danger'}">
            ${c.status === 'active' ? '✓ Accepte' : c.status === 'inactive' ? '⚠ N\'accepte plus' : '✗ Déconseillée'}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
};

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
  { value: 'active', label: 'Accepte des stagiaires', color: 'success' },
  { value: 'inactive', label: 'N\'accepte plus', color: 'warning' },
  { value: 'not-recommended', label: 'Déconseillée', color: 'danger' }
];

// =============================================================================
// MENU D'EXPORT
// =============================================================================
const ExportMenu = ({ companies, filteredCompanies }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleExport = (type) => {
    const dataToExport = filteredCompanies.length > 0 ? filteredCompanies : companies;
    
    switch(type) {
      case 'pdf':
        exportToPDF(dataToExport);
        break;
      case 'excel':
        exportToExcel(dataToExport);
        break;
      case 'print':
        printCompanies(dataToExport);
        break;
    }
    
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary flex items-center gap-2"
      >
        <FaFileExport size={16} />
        <span>Exporter</span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-primary-300 py-2 z-20 animate-slideDown">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors flex items-center gap-3 text-primary-800 font-semibold"
            >
              <FaFilePdf size={16} className="text-danger-600" />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors flex items-center gap-3 text-primary-800 font-semibold"
            >
              <FaFileExcel size={16} className="text-success-600" />
              Export Excel
            </button>
            <div className="border-t border-primary-200 my-1" />
            <button
              onClick={() => handleExport('print')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors flex items-center gap-3 text-primary-800 font-semibold"
            >
              <FaPrint size={16} className="text-primary-600" />
              Imprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// COMPOSANTS UI PROFESSIONNELS
// =============================================================================

const Button = ({ children, variant = 'primary', icon: Icon, onClick, disabled, type = 'button', className = '', size = 'default' }) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    default: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${sizeClasses[size]} ${className}`}
    >
      {Icon && <Icon size={iconSize} className="flex-shrink-0" />}
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, error, className = '', ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="input-icon-left">
          <Icon size={16} />
        </div>
      )}
      <input
        className={`${Icon ? 'pl-10' : ''} ${error ? 'border-danger-500 focus:ring-danger-500' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
  </div>
);

const Select = ({ label, options, error, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <select className={error ? 'border-danger-500 focus:ring-danger-500' : ''} {...props}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
  </div>
);

const Textarea = ({ label, error, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <textarea className={error ? 'border-danger-500 focus:ring-danger-500' : ''} rows={4} {...props} />
    {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'default' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    default: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-primary-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden animate-scaleIn`}>
        <div className="sticky top-0 backdrop-professional border-b border-primary-300 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg hover:bg-primary-100">
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-5rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const StarRating = ({ rating, onRate, readonly = false }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRate && onRate(star)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          {star <= rating ? (
            <FaStar size={20} className="text-warning-500" />
          ) : (
            <FaRegStar size={20} className="text-primary-300" />
          )}
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
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isSelected
              ? 'bg-accent-600 text-white shadow-sm border-2 border-accent-600'
              : 'bg-primary-100 text-primary-800 hover:bg-primary-200 border-2 border-primary-200'
          } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <FaTag size={12} />
          {tag}
        </button>
      );
    })}
  </div>
);

const StatusBadge = ({ status }) => {
  const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
  const Icon = status === 'active' ? FaCheck : status === 'inactive' ? FaExclamationCircle : FaTimes;
  
  return (
    <span className={`badge badge-${statusConfig.color} inline-flex items-center gap-1.5`}>
      <Icon size={12} />
      {statusConfig.label}
    </span>
  );
};

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-slideUp">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-900 rounded-xl mb-4 shadow-lg">
            <FaBuilding size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Stages Menuiserie</h1>
          <p className="text-primary-600">Gestion des entreprises partenaires</p>
        </div>

        <div className="card p-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Adresse email"
              type="email"
              icon={FaEnvelope}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@lycee.fr"
              required
              autoComplete="email"
            />

            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-700 transition-colors"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-danger-50 border-2 border-danger-200 rounded-lg text-danger-700 text-sm animate-slideDown">
                <FaExclamationCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full justify-center" disabled={loading} size="lg">
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// GESTION DES UTILISATEURS
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
        <Button icon={FaPlus} onClick={() => setShowAddUser(!showAddUser)}>
          Ajouter un utilisateur
        </Button>
      </div>

      {showAddUser && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <h3 className="font-bold text-lg mb-4 text-primary-900">Nouvel Utilisateur</h3>
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
          <Button type="submit" icon={FaCheck}>Créer l'utilisateur</Button>
        </form>
      )}

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
            <div className="flex-1">
              <p className="font-semibold text-primary-900">{user.name}</p>
              <p className="text-sm text-primary-600">{user.email}</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${
                user.role === 'admin' ? 'bg-primary-900 text-white border-primary-900' :
                user.role === 'teacher' ? 'bg-accent-100 text-accent-800 border-accent-300' :
                'bg-success-100 text-success-800 border-success-300'
              }`}>
                {user.role === 'admin' ? '👨‍💼 Admin' : user.role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'}
              </span>
            </div>
            {user.id !== currentUser.id && (
              <Button variant="danger" icon={FaTrash} size="sm" onClick={() => handleDeleteUser(user.id)}>
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
          icon={FaPhone}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          icon={FaEnvelope}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="mb-4">
        <label className="form-label">Activités / Spécialités *</label>
        <TagSelector selectedTags={formData.tags} onToggle={toggleTag} />
      </div>

      <Select
        label="Statut *"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        options={STATUS_OPTIONS}
      />

      <div className="mb-4">
        <label className="form-label">Évaluation</label>
        <StarRating rating={formData.rating} onRate={(rating) => setFormData({ ...formData, rating })} />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" icon={FaCheck}>
          {company ? 'Enregistrer' : 'Ajouter'}
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
        <div className="flex items-center justify-between pb-4 divider">
          <StatusBadge status={company.status} />
          <StarRating rating={company.rating} readonly />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-primary-500 mb-1 uppercase font-semibold tracking-wide">Adresse</p>
            <p className="text-sm font-medium flex items-center gap-2 text-primary-900">
              <FaMapMarkerAlt size={16} className="text-primary-400" />
              {company.address}, {company.postalCode} {company.city}
            </p>
          </div>
          {company.contactName && (
            <div>
              <p className="text-xs text-primary-500 mb-1 uppercase font-semibold tracking-wide">Contact</p>
              <p className="text-sm font-medium flex items-center gap-2 text-primary-900">
                <FaUser size={16} className="text-primary-400" />
                {company.contactName}
              </p>
            </div>
          )}
          {company.phone && (
            <div>
              <p className="text-xs text-primary-500 mb-1 uppercase font-semibold tracking-wide">Téléphone</p>
              <p className="text-sm font-medium flex items-center gap-2 text-primary-900">
                <FaPhone size={16} className="text-primary-400" />
                {company.phone}
              </p>
            </div>
          )}
          {company.email && (
            <div>
              <p className="text-xs text-primary-500 mb-1 uppercase font-semibold tracking-wide">Email</p>
              <p className="text-sm font-medium flex items-center gap-2 text-primary-900">
                <FaEnvelope size={16} className="text-primary-400" />
                {company.email}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-primary-500 mb-2 uppercase font-semibold tracking-wide">Activités</p>
          <TagSelector selectedTags={company.tags} readonly />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold flex items-center gap-2 text-primary-900">
              <FaComments size={18} />
              Historique ({company.history?.length || 0})
            </h3>
            {canEdit && (
              <Button
                variant="secondary"
                icon={FaPlus}
                size="sm"
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                Ajouter
              </Button>
            )}
          </div>

          {showCommentForm && (
            <form onSubmit={handleAddComment} className="mb-4 p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
              <Textarea
                label="Commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Expérience avec cette entreprise..."
                required
              />
              <div className="mb-4">
                <label className="form-label">Note</label>
                <StarRating rating={commentRating} onRate={setCommentRating} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" icon={FaCheck} size="sm">Publier</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCommentForm(false)}>Annuler</Button>
              </div>
            </form>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {company.history?.length === 0 && (
              <p className="text-primary-500 text-sm text-center py-4">Aucun commentaire</p>
            )}
            {company.history?.map(item => (
              <div key={item.id} className="p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-primary-900">{item.authorName}</span>
                  <span className="text-xs text-primary-500 flex items-center gap-1">
                    <FaCalendar size={12} />
                    {new Date(item.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <StarRating rating={item.rating} readonly />
                <p className="text-sm text-primary-700 mt-2">{item.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-3 pt-4 divider">
            <Button icon={FaEdit} size="sm" onClick={onEdit}>Modifier</Button>
            <Button variant="danger" icon={FaTrash} size="sm" onClick={onDelete}>Supprimer</Button>
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
  return (
    <div onClick={onClick} className="card card-interactive p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-primary-900 group-hover:text-accent-600 transition-colors">
          {company.name}
        </h3>
        <StarRating rating={company.rating} readonly />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-primary-600 flex items-center gap-2">
          <FaMapMarkerAlt size={14} className="text-primary-400 flex-shrink-0" />
          {company.postalCode} {company.city}
        </p>
        {company.contactName && (
          <p className="text-sm text-primary-600 flex items-center gap-2">
            <FaUser size={14} className="text-primary-400 flex-shrink-0" />
            {company.contactName}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {company.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2.5 py-1 bg-accent-50 text-accent-700 rounded text-xs font-semibold border border-accent-200">
            {tag}
          </span>
        ))}
        {company.tags.length > 3 && (
          <span className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded text-xs font-semibold border border-primary-200">
            +{company.tags.length - 3}
          </span>
        )}
      </div>

      <StatusBadge status={company.status} />
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
    <div className="min-h-screen bg-primary-50">
      <header className="sticky top-0 z-40 backdrop-professional border-b border-primary-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center shadow-sm">
                  <FaBuilding size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-primary-900 leading-none">Stages Menuiserie</h1>
                  <p className="text-xs text-primary-500 mt-0.5">{companies.length} entreprises</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-primary-50 rounded-lg border-2 border-primary-200">
                <FaUser size={16} className="text-primary-400" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary-900 leading-none">{currentUser.name}</p>
                  <span className={`text-xs mt-0.5 inline-block px-2 py-0.5 rounded font-semibold border ${
                    currentUser.role === 'admin' ? 'bg-primary-900 text-white border-primary-900' :
                    currentUser.role === 'teacher' ? 'bg-accent-100 text-accent-800 border-accent-300' :
                    'bg-success-100 text-success-800 border-success-300'
                  }`}>
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'teacher' ? 'Professeur' : 'Élève'}
                  </span>
                </div>
              </div>

              {currentUser.role === 'admin' && (
                <Button variant="secondary" icon={FaUsers} size="sm" onClick={() => setShowUserManagement(true)}>
                  Utilisateurs
                </Button>
              )}

              <ExportMenu companies={companies} filteredCompanies={filteredCompanies} />

              <Button variant="ghost" icon={FaSignOutAlt} size="sm" onClick={() => setCurrentUser(null)}>
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="input-icon-left">
                <FaSearch size={16} />
              </div>
              <input
                type="text"
                placeholder="Rechercher une entreprise ou une ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                icon={FaFilter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtres
                {(selectedTags.length > 0 || selectedStatus !== 'all' || postalCodeFilter) && 
                  ` (${selectedTags.length + (selectedStatus !== 'all' ? 1 : 0) + (postalCodeFilter ? 1 : 0)})`
                }
              </Button>

              {canEdit && (
                <Button icon={FaPlus} onClick={() => setShowAddForm(true)}>
                  Ajouter
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 divider animate-slideDown">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Code postal</label>
                  <input
                    type="text"
                    placeholder="74, 75, etc."
                    value={postalCodeFilter}
                    onChange={(e) => setPostalCodeFilter(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Statut</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">Tous les statuts</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="form-label">Activités</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                          selectedTags.includes(tag)
                            ? 'bg-accent-600 text-white border-accent-600'
                            : 'bg-primary-100 text-primary-800 hover:bg-primary-200 border-primary-200'
                        }`}
                      >
                        <FaTag size={10} />
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
                    className="text-sm text-accent-600 hover:text-accent-700 font-semibold"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <FaBuilding size={48} className="mx-auto text-primary-300 mb-4" />
            <p className="text-primary-500 text-base">Aucune entreprise trouvée</p>
            {canEdit && (
              <Button icon={FaPlus} onClick={() => setShowAddForm(true)} className="mt-4">
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
    </div>
  );
}
