import type { Metadata } from 'next';
import './globals.css';
import { getSessionProfile } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sistema de Gestión — Corporación Zona Lacustre',
  description: 'Gestión interna de la Corporación de Usuarios Medicinales de Cannabis Zona Lacustre',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <html lang="es">
      <body>
        {profile ? (
          <div className="flex min-h-screen">
            <Sidebar profile={profile} />
            <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen flex items-center justify-center">{children}</main>
        )}
      </body>
    </html>
  );
}
