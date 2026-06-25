import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyB8JPD3QOmTYFmzokn6zBm5ovARphmOkMA",
  authDomain: "ftss-dispatcher.firebaseapp.com",
  projectId: "ftss-dispatcher",
  storageBucket: "ftss-dispatcher.firebasestorage.app",
  messagingSenderId: "392375812372",
  appId: "1:392375812372:web:abbcb0675a77b16024c201"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
export default app
