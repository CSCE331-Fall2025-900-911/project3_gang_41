import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cashier from './Cashier';
import LoginPage from './Login';
import Kiosk from './Kiosk';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/manager" element={<div>Manager</div>} />
        <Route path="/menu-board" element={<div>Menu Board</div>} />

        {/* navigation for kiosk screens here */}
        <Route path="/kioskmenu" element={<Kioskmenu/>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
