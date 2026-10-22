// Escolhe o modo: Firebase (padrão) ou demonstração (VITE_DEMO=1, usado na prévia).
import { usarDemo } from '../firebase-config'

const api = usarDemo ? await import('./demo.js') : await import('./firebase.js')

export default api
