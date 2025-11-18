import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import RoomsPage from './pages/RoomsPage'
import ItemPage from './pages/ItemPage'

export default function App(){
  return (
    <BrowserRouter>
      <div>
        <header style={{padding:12, background:'#fff', borderBottom:'1px solid #eee'}}>
          <nav style={{display:'flex', gap:12}}>
            <Link to="/">Selecionar base</Link>
            <Link to="/salas">Salas</Link>
            <Link to="/item">Item</Link>
          </nav>
        </header>
        <main style={{padding:20}}>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/salas" element={<RoomsPage />} />
            <Route path="/item" element={<ItemPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
