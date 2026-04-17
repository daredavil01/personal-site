import React from 'react';
import AdminNav from '../components/Admin/AdminNav';

const AdminLayout = ({ section, onNavigate, onLogout, children }) => (
  <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
    <AdminNav section={section} onNavigate={onNavigate} onLogout={onLogout} />
    <main className="max-w-4xl mx-auto px-6 py-10">
      {children}
    </main>
  </div>
);

export default AdminLayout;
