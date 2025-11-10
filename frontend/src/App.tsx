import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import KioskLogin from "./kioskLogin"
import Kioskmenu from "./kioskmenu"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/cashier" element={<div>Cashier</div>} />
        <Route path="/kiosk" element={<KioskLogin/>} />
        <Route path="/manager" element={<div>Manager</div>} />
        <Route path="/menu-board" element={<div>Menu Board</div>} />

        {/* navigation for kiosk screens here */}
        <Route path="/kioskmenu" element={<Kioskmenu/>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
