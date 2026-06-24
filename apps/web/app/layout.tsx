import './globals.css';
import React from 'react';

export const metadata = {
  title: 'CodeShip | Lightweight PaaS',
  description: 'Deploy React, Next.js, and Express applications in isolated Docker containers instantly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased min-h-screen flex flex-col selection:bg-white selection:text-black">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
