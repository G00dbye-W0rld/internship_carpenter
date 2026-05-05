import React, { useState, useEffect } from 'react';
import { 
  FaBuilding,
  FaPlus,
  FaFilter,
  FaStar,
  FaRegStar,
  FaMapMarkerAlt,
  FaTag,
  FaEdit,
  FaTrash,
  FaComments,
  FaSignOutAlt,
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
  FaPrint,
  FaEye,
  FaFileImport,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut
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
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

// =============================================================================
// COMPOSANT ANIMATION PARTICULES
// =============================================================================
const ParticleBackground = () => {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 70; // Nombre de particules (sobre)

    // Créer les particules
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.3 + 0.1 // Très léger
      });
    }

    // Animation
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        // Dessiner particule
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(71, 85, 105, ${particle.opacity})`;
        ctx.fill();

        // Déplacer
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Rebond sur les bords
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
      });

      requestAnimationFrame(animate);
    }

    animate();

    // Redimensionnement
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.8 // Opacité générale très légère
      }}
    />
  );
};

// =============================================================================
// 2 COMPTES GÉNÉRIQUES SEULEMENT
// =============================================================================
const GENERIC_ACCOUNTS = {
  'prof': {
    email: 'prof@stages.local',
    password: 'ecachav123',
    name: 'Professeur',
    role: 'teacher'
  },
  'eleve': {
    email: 'eleve@stages.local',
    password: 'eleve123',
    name: 'Élève',
    role: 'student'
  }
};


// =============================================================================
// MAPPING SECTEURS D'ACTIVITÉ ECOLEDIRECT
// =============================================================================
const SECTOR_MAPPING = {
  // Secteurs principaux
  'menuiserie': ['Menuiserie'],
  'pose': ['Pose'],
  'charpente': ['Charpente'],
  'atelier': ['Atelier'],
  'agencement': ['Agencement'],
  'ébénisterie': ['Ébénisterie'],
  'ebenisterie': ['Ébénisterie'],
  'escalier': ['Escaliers'],
  'escaliers': ['Escaliers'],
  'parquet': ['Parquets'],
  'parquets': ['Parquets'],
  'fenêtre': ['Fenêtres/Portes'],
  'fenetre': ['Fenêtres/Portes'],
  'porte': ['Fenêtres/Portes'],
  'portes': ['Fenêtres/Portes'],
  'bois': ['Menuiserie'],
  'construction bois': ['Charpente', 'Menuiserie'],
  
  // 🆕 NOUVEAUX : Niveaux de formation depuis EcoleDirecte
  'cap fabricant': ['CAP', 'Atelier'],
  'cap installateur': ['CAP', 'Pose'],
  'bac pro menuisier': ['Bac Pro', 'Menuiserie'],
  'cap': ['CAP'],
  'bac pro': ['Bac Pro']
};

// =============================================================================
// FIREBASE SERVICE
// =============================================================================
const firebaseService = {
  async signIn(username, password) {
    try {
      const account = GENERIC_ACCOUNTS[username.toLowerCase()];
      if (!account || account.password !== password) {
        throw new Error('Identifiant ou mot de passe incorrect');
      }
      
      await signInWithEmailAndPassword(auth, account.email, account.password);
      return account;
    } catch (error) {
      console.error('Erreur connexion:', error);
      throw new Error('Identifiant ou mot de passe incorrect');
    }
  },
  
  async signOut() {
    await firebaseSignOut(auth);
  },
  
  calculateAverageRating(history) {
    if (!history || history.length === 0) return 0;
    const sum = history.reduce((acc, item) => acc + (item.rating || 0), 0);
    return Math.round(sum / history.length);
  },
  
  async getCompanies() {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const companies = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const companyData = docSnapshot.data();
        const history = [];
        
        try {
          const historySnapshot = await getDocs(
            query(collection(db, `companies/${docSnapshot.id}/history`), orderBy('date', 'desc'))
          );
          historySnapshot.docs.forEach(h => {
            const historyData = h.data();
            history.push({
              id: h.id,
              ...historyData,
              date: historyData.date?.toDate ? historyData.date.toDate() : new Date(historyData.date)
            });
          });
        } catch (e) {
          console.log('No history for company', docSnapshot.id);
        }
        
        const averageRating = this.calculateAverageRating(history);
        
        const company = {
          id: docSnapshot.id,
          ...companyData,
          rating: averageRating,
          createdAt: companyData.createdAt?.toDate ? companyData.createdAt.toDate() : new Date(),
          updatedAt: companyData.updatedAt?.toDate ? companyData.updatedAt.toDate() : new Date(),
          history
        };
        
        companies.push(company);
      }
      
      return companies;
    } catch (error) {
      console.error('Error getCompanies:', error);
      return [];
    }
  },
  
  async addCompany(data) {
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...data, rating: 0 };
    } catch (error) {
      console.error('Error addCompany:', error);
      throw error;
    }
  },
  
  async updateCompany(id, data) {
    try {
      await updateDoc(doc(db, 'companies', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updateCompany:', error);
      throw error;
    }
  },
  
  async deleteCompany(id) {
    try {
      const historySnapshot = await getDocs(collection(db, `companies/${id}/history`));
      for (const historyDoc of historySnapshot.docs) {
        await deleteDoc(doc(db, `companies/${id}/history`, historyDoc.id));
      }
      await deleteDoc(doc(db, 'companies', id));
    } catch (error) {
      console.error('Error deleteCompany:', error);
      throw error;
    }
  },
  
  async addComment(companyId, comment) {
    try {
      const commentData = {
        ...comment,
        date: serverTimestamp()
      };
      await addDoc(collection(db, `companies/${companyId}/history`), commentData);
    } catch (error) {
      console.error('Error addComment:', error);
      throw error;
    }
  },
  
  async deleteComment(companyId, commentId) {
    try {
      await deleteDoc(doc(db, `companies/${companyId}/history`, commentId));
    } catch (error) {
      console.error('Error deleteComment:', error);
      throw error;
    }
  },
  
  onSnapshot(callback) {
    const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async (snap) => {
      const companies = [];
      for (const docSnap of snap.docs) {
        const companyData = docSnap.data();
        const history = [];
        
        try {
          const historySnapshot = await getDocs(
            query(collection(db, `companies/${docSnap.id}/history`), orderBy('date', 'desc'))
          );
          historySnapshot.docs.forEach(h => {
            const historyData = h.data();
            history.push({
              id: h.id,
              ...historyData,
              date: historyData.date?.toDate ? historyData.date.toDate() : new Date(historyData.date)
            });
          });
        } catch (e) {
          console.log('No history for company', docSnap.id);
        }
        
        const averageRating = this.calculateAverageRating(history);
        
        const company = {
          id: docSnap.id,
          ...companyData,
          rating: averageRating,
          createdAt: companyData.createdAt?.toDate ? companyData.createdAt.toDate() : new Date(),
          updatedAt: companyData.updatedAt?.toDate ? companyData.updatedAt.toDate() : new Date(),
          history
        };
        companies.push(company);
      }
      callback(companies);
    });
  }
};

const firebase = firebaseService;

// =============================================================================
// UTILITAIRES IMPORT ECOLEDIRECT
// =============================================================================

// Extraire le code postal de l'adresse avec patterns multiples
const extractPostalCode = (address) => {
  if (!address) return '';
  
  // Pattern 1: Code postal seul (ex: "12345")
  let match = address.match(/\b(\d{5})\b/);
  if (match) return match[1];
  
  // Pattern 2: Code postal avec ville (ex: "12345 - VILLE")
  match = address.match(/(\d{5})\s*-/);
  if (match) return match[1];
  
  // Pattern 3: Ville avec code postal (ex: "VILLE - 12345")
  match = address.match(/-\s*(\d{5})/);
  if (match) return match[1];
  
  console.warn(`⚠️ Code postal non trouvé dans l'adresse: "${address}"`);
  return '';
};

// Nettoyer l'adresse (enlever le code postal si présent)
const cleanAddress = (address, postalCode) => {
  if (!address) return '';
  if (postalCode) {
    return address.replace(postalCode, '').replace(/,\s*$/, '').trim();
  }
  return address;
};

// Mapper secteur d'activité vers tags avec gestion robuste
const mapSectorToTags = (sector) => {
  if (!sector) return [];
  
  const tags = new Set();
  const sectorLower = sector.toLowerCase().trim();
  
  // Recherche exacte d'abord
  if (SECTOR_MAPPING[sectorLower]) {
    SECTOR_MAPPING[sectorLower].forEach(tag => tags.add(tag));
  }
  
  // Recherche par mots-clés si pas de correspondance exacte
  if (tags.size === 0) {
    Object.keys(SECTOR_MAPPING).forEach(key => {
      if (sectorLower.includes(key)) {
        SECTOR_MAPPING[key].forEach(tag => tags.add(tag));
      }
    });
  }
  
  // Tag par défaut si rien n'est trouvé
  return tags.size > 0 ? Array.from(tags) : ['Menuiserie'];
};

// Mapper niveaux vers tags
const mapLevelsToTags = (levels) => {
  if (!levels) return [];
  
  const tags = [];
  const levelsLower = levels.toLowerCase();
  
  if (levelsLower.includes('cap')) tags.push('CAP');
  if (levelsLower.includes('bac') || levelsLower.includes('2nde') || 
      levelsLower.includes('1ère') || levelsLower.includes('terminale')) {
    tags.push('Bac Pro');
  }
  
  return tags;
};

// Parser le fichier Excel EcoleDirecte avec gestion robuste et logs
const parseEcoleDirectFile = async (file) => {
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        console.log(`📊 Import: ${jsonData.length} lignes trouvées`);
        console.log('📋 Colonnes disponibles:', Object.keys(jsonData[0] || {}));
        
        const companies = jsonData.map((row, index) => {
          // Gérer les variations de noms de colonnes
          const secteur = row["Secteur d'Activité"] || row["Secteur Activité"] || row["Secteur"] || '';
          const adresse = row['Adresse'] || '';
          const ville = row['Ville'] || '';
          const niveaux = row['Niveaux'] || row['Niveau(x)'] || '';
          
          // Extraction du code postal
          const postalCode = extractPostalCode(adresse);
          
          // Mapping des tags
          const sectorTags = mapSectorToTags(secteur);
          const levelTags = mapLevelsToTags(niveaux);
          const allTags = [...new Set([...sectorTags, ...levelTags])];
          
          // Log de debug pour les premières lignes
          if (index < 3) {
            console.log(`\n🔍 Ligne ${index + 1}:`, {
              nom: row['Nom'],
              secteur,
              niveaux,
              tags: allTags,
              codePostal: postalCode || '❌ MANQUANT'
            });
          }
          
          return {
            id: `import-${index}`,
            name: row['Nom'] || '',
            address: cleanAddress(adresse, postalCode),
            postalCode: postalCode,
            city: ville,
            phone: row['Téléphone'] || '',
            email: row['Email'] || '',
            contactName: '',
            tags: allTags.length > 0 ? allTags : ['Menuiserie'], // Tag par défaut
            status: 'active',
            evaluation: parseFloat(row['Evaluation /5'] || row['Évaluations / 5']) || 0,
            students: row['Élèves'] || row['Elèves'] || '',
            sector: secteur,
            levels: niveaux,
            isValid: !!(row['Nom'] && ville),
            needsPostalCode: !postalCode
          };
        });
        
        // Statistiques finales
        const validCount = companies.filter(c => c.isValid && !c.needsPostalCode).length;
        const missingPostal = companies.filter(c => c.needsPostalCode).length;
        const invalid = companies.filter(c => !c.isValid).length;
        
        console.log('\n✅ Résultats du parsing:');
        console.log(`  • ${validCount} entreprises valides`);
        console.log(`  • ${missingPostal} codes postaux manquants`);
        console.log(`  • ${invalid} lignes invalides (nom ou ville manquant)`);
        
        resolve(companies);
      } catch (error) {
        console.error('❌ Erreur parsing Excel:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsArrayBuffer(file);
  });
};



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
  { name: "Menuiserie", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { name: "Pose", color: "bg-green-100 text-green-800 border-green-300" },
  { name: "Charpente", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { name: "Atelier", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { name: "Agencement", color: "bg-pink-100 text-pink-800 border-pink-300" },
  { name: "Ébénisterie", color: "bg-red-100 text-red-800 border-red-300" },
  { name: "Escaliers", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { name: "Parquets", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { name: "Fenêtres/Portes", color: "bg-teal-100 text-teal-800 border-teal-300" },
  { name: "CAP", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  { name: "Bac Pro", color: "bg-violet-100 text-violet-800 border-violet-300" }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Accepte des stagiaires', color: 'success' },
  { value: 'inactive', label: 'N\'accepte plus', color: 'warning' },
  { value: 'not-recommended', label: 'Déconseillée', color: 'danger' }
];

// =============================================================================
// MODAL IMPORT ECOLEDIRECT
// =============================================================================
const ImportModal = ({ isOpen, onClose, onImport, currentUser }) => {
  const [file, setFile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: result

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const parsed = await parseEcoleDirectFile(selectedFile);
      setCompanies(parsed);
      setStep(2);
    } catch (error) {
      console.error('Erreur parsing:', error);
      alert('Erreur lors de la lecture du fichier. Vérifiez le format Excel avec les colonnes : Nom, Adresse, Ville, etc.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostalCodeChange = (index, value) => {
    const updated = [...companies];
    updated[index].postalCode = value;
    updated[index].needsPostalCode = !value;
    setCompanies(updated);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);

    const results = {
      total: companies.length,
      success: 0,
      errors: []
    };

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      try {
        if (!company.name || !company.city) {
          results.errors.push({ company: company.name || 'Inconnu', error: 'Nom ou ville manquant' });
          continue;
        }

        if (company.needsPostalCode) {
          results.errors.push({ company: company.name, error: 'Code postal manquant' });
          continue;
        }

        const companyData = {
          name: company.name,
          address: company.address,
          postalCode: company.postalCode,
          city: company.city,
          phone: company.phone,
          email: company.email,
          contactName: company.contactName,
          tags: company.tags,
          status: company.status,
          createdBy: currentUser.role
        };

        const addedCompany = await firebase.addCompany(companyData);

        if (company.evaluation > 0) {
          let commentText = `Évaluation initiale : ${company.evaluation}/5`;
          if (company.students) {
            commentText += `\nÉlève(s) placé(s) : ${company.students}`;
          }

          await firebase.addComment(addedCompany.id, {
            comment: commentText,
            rating: Math.round(company.evaluation),
            authorName: currentUser.name,
            authorRole: currentUser.role
          });
        }

        results.success++;
      } catch (error) {
        console.error('Erreur import:', error);
        results.errors.push({ company: company.name, error: error.message });
      }

      setImportProgress(Math.round(((i + 1) / companies.length) * 100));
    }

    setImportResult(results);
    setStep(3);
    setImporting(false);

    if (onImport) {
      await onImport();
    }
  };

  const reset = () => {
    setFile(null);
    setCompanies([]);
    setStep(1);
    setImportProgress(0);
    setImportResult(null);
  };

  if (!isOpen) return null;

  const validCompanies = companies.filter(c => c.isValid && !c.needsPostalCode);
  const invalidCompanies = companies.filter(c => !c.isValid || c.needsPostalCode);

  return (
    <Modal isOpen={true} onClose={onClose} title="Importer depuis EcoleDirecte" size="lg">
      {step === 1 && (
        <div className="text-center py-8">
          <div className="mb-6">
            <FaFileImport size={64} className="mx-auto text-primary-400 mb-4" />
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              Importer des entreprises depuis EcoleDirecte
            </h3>
            <p className="text-sm text-primary-600 mb-4">
              Sélectionnez le fichier Excel exporté depuis EcoleDirecte
            </p>
          </div>

          <label className="btn btn-primary cursor-pointer inline-flex items-center gap-2">
            <FaFileExcel size={18} />
            <span>Sélectionner le fichier Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {loading && (
            <div className="mt-4 text-primary-600">
              Analyse du fichier en cours...
            </div>
          )}

          <div className="mt-8 p-4 bg-accent-50 border-2 border-accent-200 rounded-lg text-left">
            <p className="font-semibold text-accent-800 mb-2">Format attendu :</p>
            <p className="text-sm text-accent-700">
              Colonnes : Nom, Adresse, Ville, Secteur d'Activité, Élèves, Niveaux, Téléphone, Email, Evaluation /5
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-4 p-4 bg-primary-50 border-2 border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-primary-900">
                  {companies.length} entreprise(s) détectée(s)
                </p>
                <p className="text-sm text-primary-600">
                  {validCompanies.length} prête(s) à importer
                  {invalidCompanies.length > 0 && ` • ${invalidCompanies.length} nécessite(nt) correction`}
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
            {companies.map((company, index) => (
              <div
                key={company.id}
                className={`p-4 rounded-lg border-2 ${
                  company.isValid && !company.needsPostalCode
                    ? 'bg-success-50 border-success-200'
                    : 'bg-warning-50 border-warning-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {company.isValid && !company.needsPostalCode ? (
                      <FaCheckCircle className="text-success-600" size={20} />
                    ) : (
                      <FaExclamationCircle className="text-warning-600" size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary-900">{company.name}</p>
                    <p className="text-sm text-primary-700">
                      {company.address}
                      {company.postalCode && `, ${company.postalCode}`} {company.city}
                    </p>
                    {company.needsPostalCode && (
                      <div className="mt-2">
                        <label className="text-xs text-primary-600 block mb-1">
                          Code postal manquant :
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 74000"
                          value={company.postalCode}
                          onChange={(e) => handlePostalCodeChange(index, e.target.value)}
                          className="w-32 px-2 py-1 text-sm border-2 border-warning-300 rounded"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {company.tags.map(tag => {
                        const tagDef = PREDEFINED_TAGS.find(t => t.name === tag);
                        const tagColor = tagDef ? tagDef.color : 'bg-gray-100 text-gray-800';
                        return (
                          <span key={tag} className={`px-2 py-0.5 rounded text-xs font-semibold ${tagColor}`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    {company.evaluation > 0 && (
                      <p className="text-xs text-primary-600 mt-1">
                        Évaluation : {company.evaluation}/5
                        {company.students && ` • Élève(s) : ${company.students}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={validCompanies.length === 0 || importing}
              icon={FaFileImport}
            >
              {importing ? 'Import en cours...' : `Importer ${validCompanies.length} entreprise(s)`}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Annuler
            </Button>
          </div>

          {importing && (
            <div className="mt-4">
              <div className="w-full bg-primary-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-accent-600 h-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-primary-600 mt-2 text-center">
                {importProgress}% - Import en cours...
              </p>
            </div>
          )}
        </div>
      )}

      {step === 3 && importResult && (
        <div className="text-center py-8">
          <FaCheckCircle size={64} className="mx-auto text-success-600 mb-4" />
          <h3 className="text-xl font-bold text-primary-900 mb-4">
            Import terminé !
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-success-50 border-2 border-success-200 rounded-lg">
              <p className="text-3xl font-bold text-success-700">{importResult.success}</p>
              <p className="text-sm text-success-600">Entreprises ajoutées</p>
            </div>
            <div className="p-4 bg-danger-50 border-2 border-danger-200 rounded-lg">
              <p className="text-3xl font-bold text-danger-700">{importResult.errors.length}</p>
              <p className="text-sm text-danger-600">Erreurs</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="text-left mb-6 p-4 bg-danger-50 border-2 border-danger-200 rounded-lg max-h-48 overflow-y-auto">
              <p className="font-semibold text-danger-800 mb-2">Erreurs détectées :</p>
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-sm text-danger-700">
                  • {err.company} : {err.error}
                </p>
              ))}
            </div>
          )}

          <Button onClick={() => { reset(); onClose(); }}>
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  );
};

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

const Input = ({ label, error, className = '', ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input
      className={`${error ? 'border-danger-500 focus:ring-danger-500' : ''} ${className}`}
      {...props}
    />
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

const TagSelector = ({ selectedTags, onToggle, readonly = false }) => {
  const getTagColor = (tagName) => {
    const tag = PREDEFINED_TAGS.find(t => t.name === tagName);
    return tag ? tag.color : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PREDEFINED_TAGS.map(tag => {
        const isSelected = selectedTags.includes(tag.name);
        return (
          <button
            key={tag.name}
            type="button"
            onClick={() => !readonly && onToggle(tag.name)}
            disabled={readonly}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
              isSelected ? tag.color : 'bg-primary-100 text-primary-800 border-primary-200 hover:bg-primary-200'
            } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <FaTag size={12} />
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await firebase.signIn(username, password);
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
              label="Nom du compte"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="prof ou eleve"
              required
              autoComplete="username"
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

            <div className="pt-4 border-t border-primary-200">
              <p className="text-xs text-primary-500 text-center">
                Comptes disponibles : <strong>prof</strong>, <strong>eleve</strong>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
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
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, createdBy: currentUser.role });
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
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
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

      <div className="p-3 bg-accent-50 border-2 border-accent-200 rounded-lg text-accent-700 text-sm mb-4">
        <p className="font-semibold mb-1">ℹ️ Note de l'entreprise</p>
        <p>La note est calculée automatiquement en fonction de la moyenne des avis.</p>
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
const CompanyDetail = ({ company, onClose, onEdit, onDelete, onRefresh, currentUser }) => {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState('');
  const [commentRating, setCommentRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = currentUser.role === 'teacher';
  const canComment = currentUser.role === 'teacher';

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      await firebase.addComment(company.id, {
        comment: comment.trim(),
        rating: commentRating,
        authorName: currentUser.name,
        authorRole: currentUser.role
      });
      
      setComment('');
      setCommentRating(3);
      setShowCommentForm(false);
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      alert(`Erreur lors de l'ajout du commentaire: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;
    
    try {
      await firebase.deleteComment(company.id, commentId);
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const getTagColor = (tagName) => {
    const tag = PREDEFINED_TAGS.find(t => t.name === tagName);
    return tag ? tag.color : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (date) => {
    if (!date) return 'Date inconnue';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Date invalide';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={company.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 divider">
          <StatusBadge status={company.status} />
          <div className="text-right">
            <StarRating rating={company.rating} readonly />
            <p className="text-xs text-primary-500 mt-1">
              {company.history?.length > 0 
                ? `Moyenne de ${company.history.length} avis`
                : 'Aucun avis'
              }
            </p>
          </div>
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
          <div className="flex flex-wrap gap-2">
            {company.tags.map(tag => (
              <span key={tag} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 ${getTagColor(tag)}`}>
                <FaTag size={12} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold flex items-center gap-2 text-primary-900">
              <FaComments size={18} />
              Avis & Commentaires ({company.history?.length || 0})
            </h3>
            {canComment && (
              <Button
                variant="secondary"
                icon={FaPlus}
                size="sm"
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                Ajouter un avis
              </Button>
            )}
          </div>

          {showCommentForm && (
            <form onSubmit={handleAddComment} className="mb-4 p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
              <Textarea
                label="Votre commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec cette entreprise..."
                required
              />
              <div className="mb-4">
                <label className="form-label">Votre note</label>
                <StarRating rating={commentRating} onRate={setCommentRating} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" icon={FaCheck} size="sm" disabled={submitting}>
                  {submitting ? 'Publication...' : 'Publier'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowCommentForm(false);
                    setComment('');
                    setCommentRating(3);
                  }}
                  disabled={submitting}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(!company.history || company.history.length === 0) && (
              <p className="text-primary-500 text-sm text-center py-4">Aucun avis pour le moment</p>
            )}
            {company.history?.map(item => (
              <div key={item.id} className="p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm text-primary-900">{item.authorName}</span>
                    <span className="text-xs text-primary-500 ml-2">
                      ({item.authorRole === 'teacher' ? 'Professeur' : 'Élève'})
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteComment(item.id)}
                      className="text-danger-600 hover:text-danger-700 p-1 hover:bg-danger-50 rounded transition-colors"
                      title="Supprimer le commentaire"
                    >
                      <FaTrash size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={item.rating || 0} readonly />
                  <span className="text-xs text-primary-500 flex items-center gap-1">
                    <FaCalendar size={10} />
                    {formatDate(item.date)}
                  </span>
                </div>
                <p className="text-sm text-primary-700">{item.comment}</p>
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
  const getTagColor = (tagName) => {
    const tag = PREDEFINED_TAGS.find(t => t.name === tagName);
    return tag ? tag.color : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div onClick={onClick} className="card card-interactive p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-primary-900 group-hover:text-accent-600 transition-colors">
          {company.name}
        </h3>
        <div className="text-right">
          <StarRating rating={company.rating} readonly />
          {company.history?.length > 0 && (
            <p className="text-xs text-primary-500 mt-1">
              {company.history.length} avis
            </p>
          )}
        </div>
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
          <span key={tag} className={`px-2.5 py-1 rounded text-xs font-semibold border ${getTagColor(tag)}`}>
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
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

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

  const refreshCompanies = async () => {
    const data = await firebase.getCompanies();
    setCompanies(data);
    
    if (selectedCompany) {
      const updated = data.find(c => c.id === selectedCompany.id);
      if (updated) {
        setSelectedCompany(updated);
      }
    }
  };

  const handleSaveCompany = async (companyData) => {
    try {
      if (editingCompany) {
        await firebase.updateCompany(editingCompany.id, companyData);
        setEditingCompany(null);
      } else {
        await firebase.addCompany(companyData);
        setShowAddForm(false);
      }
      await refreshCompanies();
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteCompany = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      try {
        await firebase.deleteCompany(selectedCompany.id);
        setSelectedCompany(null);
        await refreshCompanies();
      } catch (error) {
        alert(`Erreur: ${error.message}`);
      }
    }
  };

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const canEdit = currentUser?.role === 'teacher';

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

   return (
    <>
      <ParticleBackground />
      <div className="min-h-screen bg-primary-50" style={{ position: 'relative', zIndex: 1 }}>
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
                    currentUser.role === 'teacher' ? 'bg-accent-100 text-accent-800 border-accent-300' :
                    'bg-success-100 text-success-800 border-success-300'
                  }`}>
                    {currentUser.role === 'teacher' ? 'Professeur' : 'Élève'}
                  </span>
                </div>
              </div>

              <ExportMenu companies={companies} filteredCompanies={filteredCompanies} />
              {canEdit && (
                <Button
                  variant="secondary"
                  icon={FaFileImport}
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                >
                  Importer
                </Button>
              )}

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
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher une entreprise ou une ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
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
                        key={tag.name}
                        onClick={() => toggleTagFilter(tag.name)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                          selectedTags.includes(tag.name)
                            ? tag.color
                            : 'bg-primary-100 text-primary-800 border-primary-200 hover:bg-primary-200'
                        }`}
                      >
                        <FaTag size={10} />
                        {tag.name}
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
          onRefresh={refreshCompanies}
          currentUser={currentUser}
        />
      )}

      {showImportModal && (
        <ImportModal
          isOpen={true}
          onClose={() => setShowImportModal(false)}
          onImport={refreshCompanies}
          currentUser={currentUser}
        />
      )}
      </div>
    </>
  );
}
