import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import ExecutivePanel from '@/pages/ExecutivePanel';
import Performance from '@/pages/Performance';
import AsesorPanel from '@/pages/AsesorPanel';
import AcquisitionSummary from '@/pages/AcquisitionSummary';
import WeeklyReport from '@/pages/WeeklyReport';
import SystemControl from '@/pages/SystemControl';
import Configuracion from '@/pages/Configuracion';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ExecutivePanel />} />
        <Route path="/performance/*" element={<Performance />} />
        <Route path="/asesor" element={<AsesorPanel />} />
        <Route path="/acquisition" element={<AcquisitionSummary />} />
        <Route path="/weekly-report" element={<WeeklyReport />} />
        <Route path="/system" element={<SystemControl />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </Layout>
  );
}

export default App;
