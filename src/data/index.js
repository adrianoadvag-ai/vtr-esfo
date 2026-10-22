// Escolhe o modo: com as chaves do Firebase no arquivo .env, usa o Firebase; sem elas, modo demonstração.
const temFirebase = Boolean(import.meta.env.VITE_FIREBASE_API_KEY)

const api = temFirebase ? await import('./firebase.js') : await import('./demo.js')

export default api
