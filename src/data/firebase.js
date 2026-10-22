// Modo Firebase: login individual, dados no Cloud Firestore e fotos no Cloud Storage.
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  FieldPath,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { VIATURAS_INICIAIS } from './seed'
import { blobParaDataURL, comprimirFoto } from '../lib/foto'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(config)
const auth = getAuth(app)
// Cache local: o app continua funcionando sem sinal na garagem e sincroniza depois
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
// Fotos: por padrão vão comprimidas para o Firestore (gratuito no plano Spark).
// O Cloud Storage exige o plano Blaze desde fev. 2026; ative com VITE_USAR_STORAGE=1.
const usarStorage = import.meta.env.VITE_USAR_STORAGE === '1'
const storage = usarStorage ? getStorage(app) : null

export const modo = 'firebase'

const lista = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }))

export function onUsuario(cb) {
  let pararPerfil = () => {}
  const pararAuth = onAuthStateChanged(auth, (u) => {
    pararPerfil()
    if (!u) return cb(null)
    pararPerfil = onSnapshot(
      doc(db, 'usuarios', u.uid),
      (s) => cb(s.exists() ? { ...s.data(), id: u.uid, email: u.email } : { id: u.uid, email: u.email, perfil: 'pendente', semPerfil: true }),
      () => cb({ id: u.uid, email: u.email, perfil: 'pendente', semPerfil: true }),
    )
  })
  return () => {
    pararPerfil()
    pararAuth()
  }
}

export async function entrar(email, senha) {
  await signInWithEmailAndPassword(auth, email.trim(), senha)
}

export async function cadastrar({ email, senha, posto, nome }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha)
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    posto: posto.trim(),
    nome: nome.trim(),
    email: email.trim(),
    perfil: 'pendente',
    criadoEm: Date.now(),
  })
}

export const redefinirSenha = (email) => sendPasswordResetEmail(auth, email.trim())
export const sair = () => signOut(auth)

export async function listarUsuarios() {
  return lista(await getDocs(collection(db, 'usuarios'))).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
}

export const definirPerfil = (uid, perfil) => updateDoc(doc(db, 'usuarios', uid), { perfil })

export async function listarViaturas() {
  return lista(await getDocs(collection(db, 'viaturas'))).sort((a, b) => (a.ordem || 99) - (b.ordem || 99))
}

export async function salvarViatura(v) {
  const vid = v.id || `vtr-${String(v.prefixo).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const { id: _ignorar, ...dados } = v
  await setDoc(doc(db, 'viaturas', vid), dados)
  return { ...dados, id: vid }
}

export async function carregarViaturasIniciais() {
  const b = writeBatch(db)
  for (const { id, ...v } of VIATURAS_INICIAIS) b.set(doc(db, 'viaturas', id), v)
  await b.commit()
}

export function observarVistoria(data, cb) {
  return onSnapshot(doc(db, 'vistorias', data), (s) => cb(s.exists() ? { ...s.data(), id: s.id } : null))
}

export async function salvarRegistro(data, vtrId, reg, por) {
  // mergeFields troca só o registro desta VTR, sem apagar o das outras
  await setDoc(
    doc(db, 'vistorias', data),
    { data, registros: { [vtrId]: { ...reg, por, em: Date.now() } } },
    { mergeFields: ['data', new FieldPath('registros', vtrId)] },
  )
}

export const salvarMeta = (data, patch) => setDoc(doc(db, 'vistorias', data), { data, ...patch }, { merge: true })

export async function enviarVistoria(data, { relatorio, responsaveis, limpeza, kms, novasOcorrencias, por, viaturas }) {
  const b = writeBatch(db)
  b.set(
    doc(db, 'vistorias', data),
    { status: 'enviada', relatorio, responsaveis, limpeza, enviadaEm: Date.now(), enviadaPor: por },
    { merge: true },
  )
  for (const [vid, k] of Object.entries(kms)) {
    const atual = viaturas.find((x) => x.id === vid)?.kmAtual || 0
    if (k > atual) b.update(doc(db, 'viaturas', vid), { kmAtual: k, ultimaVistoria: data })
  }
  for (const o of novasOcorrencias) b.set(doc(collection(db, 'ocorrencias')), o)
  await b.commit()
}

export async function listarVistorias() {
  const q = query(collection(db, 'vistorias'), where('status', '==', 'enviada'), orderBy('data', 'desc'))
  return lista(await getDocs(q))
}

export async function listarOcorrencias() {
  return lista(await getDocs(collection(db, 'ocorrencias'))).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))
}

export const resolverOcorrencia = (oid, { por, nota, data }) =>
  updateDoc(doc(db, 'ocorrencias', oid), { status: 'resolvida', resolvidaPor: por, notaResolucao: nota || '', resolvidaEm: data })

export async function enviarFoto(data, vtrId, arquivo) {
  if (!usarStorage) {
    const imagem = await blobParaDataURL(await comprimirFoto(arquivo, 900, 0.6))
    if (imagem.length > 900000) throw new Error('Foto grande demais.')
    const r = await addDoc(collection(db, 'fotos'), { imagem, data, vtrId, em: Date.now() })
    return `fs:${r.id}`
  }
  const blob = await comprimirFoto(arquivo)
  const caminho = `vistorias/${data}/${vtrId}/${Date.now()}.jpg`
  const r = ref(storage, caminho)
  await uploadBytes(r, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(r)
}

const cacheFotos = new Map()
export async function lerFoto(ref) {
  if (!ref?.startsWith('fs:')) return ref
  if (!cacheFotos.has(ref)) {
    cacheFotos.set(
      ref,
      getDoc(doc(db, 'fotos', ref.slice(3))).then((s) => (s.exists() ? s.data().imagem : null)),
    )
  }
  return cacheFotos.get(ref)
}
