import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSessionProfile } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sistema de Gestión — Corporación Zona Lacustre',
  description: 'Gestión interna de la Corporación de Usuarios Medicinales de Cannabis Zona Lacustre',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <html lang="es">
      <body>
        {profile ? (
          <div className="flex min-h-screen">
            <Sidebar profile={profile} />
            <main className="flex-1 w-full min-w-0 pt-20 px-4 pb-6 md:p-8 max-w-6xl mx-auto">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen flex items-center justify-center p-4">{children}</main>
        )}
      </body>
    </html>
  );
}
