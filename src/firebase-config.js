// Configuração do app da Web no Firebase (projeto vtr-esfo).
// Estes valores identificam o projeto e podem ficar no código: quem protege os dados
// são as regras em firestore.rules. Para usar outro projeto (ex.: a conta da missão),
// troque os valores aqui ou defina as variáveis VITE_FIREBASE_* no arquivo .env.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBiYQVPWyqQeIzo5C7ePTuYbTw0EEyZgdI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vtr-esfo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vtr-esfo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vtr-esfo.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '339722852328',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:339722852328:web:aadc70250512d917f9f65d',
}

// Dono do projeto: ao criar o acesso com este e-mail, já entra como administrador
// (a regra correspondente está em firestore.rules)
export const EMAIL_ADMIN = 'adriano.advag@gmail.com'

// Para abrir o app em modo demonstração (sem Firebase), use VITE_DEMO=1
export const usarDemo = import.meta.env.VITE_DEMO === '1'
