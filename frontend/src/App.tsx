import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/cashier" element={<div>Cashier</div>} />
        <Route path="/kiosk" element={<div>Kiosk</div>} />
        <Route path="/manager" element={<div>Manager</div>} />
        <Route path="/menu-board" element={<div>Menu Board</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
