import React, { useState } from 'react';
import AuthGate from '../components/Admin/AuthGate';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../components/Admin/AdminDashboard';
import IntegrationsPanel from '../components/Admin/IntegrationsPanel';

// Lazy-import editors to keep the main bundle small
const NowEditor = React.lazy(() => import('../components/Admin/Editors/NowEditor'));
const BooksEditor = React.lazy(() => import('../components/Admin/Editors/BooksEditor'));
const SportsEditor = React.lazy(() => import('../components/Admin/Editors/SportsEditor'));
const TreksEditor = React.lazy(() => import('../components/Admin/Editors/TreksEditor'));
const ProjectsEditor = React.lazy(() => import('../components/Admin/Editors/ProjectsEditor'));
const HundredDaysEditor = React.lazy(() => import('../components/Admin/Editors/HundredDaysEditor'));
const InstagramEditor = React.lazy(() => import('../components/Admin/Editors/InstagramEditor'));
const ResumePositionsEditor = React.lazy(() => import('../components/Admin/Editors/ResumePositionsEditor'));
const ResumeDegreesEditor = React.lazy(() => import('../components/Admin/Editors/ResumeDegreesEditor'));
const ResumeSkillsEditor = React.lazy(() => import('../components/Admin/Editors/ResumeSkillsEditor'));
const ResumeCertificationsEditor = React.lazy(() => import('../components/Admin/Editors/ResumeCertificationsEditor'));

const EDITORS = {
  now: NowEditor,
  books: BooksEditor,
  sports: SportsEditor,
  treks: TreksEditor,
  projects: ProjectsEditor,
  hundreddays: HundredDaysEditor,
  instagram: InstagramEditor,
  positions: ResumePositionsEditor,
  degrees: ResumeDegreesEditor,
  skills: ResumeSkillsEditor,
  certifications: ResumeCertificationsEditor,
};

const Admin = () => {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('admin_authenticated') === 'true'
  );
  const [section, setSection] = useState('dashboard');

  if (!authed) {
    return <AuthGate onAuth={() => setAuthed(true)} />;
  }

  const EditorComponent = EDITORS[section];

  return (
    <AdminLayout section={section} onNavigate={setSection} onLogout={() => setAuthed(false)}>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-stone-400 font-body text-sm">
            Loading…
          </div>
        }
      >
        {section === 'dashboard' && <AdminDashboard onNavigate={setSection} />}
        {section === 'integrations' && <IntegrationsPanel />}
        {EditorComponent && <EditorComponent />}
      </React.Suspense>
    </AdminLayout>
  );
};

export default Admin;
