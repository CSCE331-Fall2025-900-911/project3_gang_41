import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cashier from './Cashier';
import LoginPage from './Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/kiosk" element={<div>Kiosk</div>} />
        <Route path="/manager" element={<div>Manager</div>} />
        <Route path="/menu-board" element={<div>Menu Board</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
