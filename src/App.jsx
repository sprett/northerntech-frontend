import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Weather from './pages/Weather'
import Stations from './pages/Stations'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Weather />} />
          <Route path="stations" element={<Stations />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
