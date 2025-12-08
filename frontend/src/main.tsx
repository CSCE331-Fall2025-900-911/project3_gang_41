import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import App from './App';
import "./global.css";
import './index.css';
import '@/lib/i18n';

// Apply saved font size preference on startup
const savedFontSize = localStorage.getItem('app-font-size');
if (savedFontSize) {
  document.documentElement.setAttribute('data-font-size', JSON.parse(savedFontSize));
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
    <Toaster position="top-center" />
  </GoogleOAuthProvider>
);
