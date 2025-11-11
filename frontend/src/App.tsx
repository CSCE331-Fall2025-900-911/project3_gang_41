import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cashier from './Cashier';
import LoginPage from './Login';
import Kiosk from './Kiosk';
import Manager from './Manager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/menu-board" element={<div>Menu Board</div>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
