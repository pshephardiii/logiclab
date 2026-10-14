import './page.css';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

type PageProps = { children: ReactNode; className?: string };

/**
 * Provides the shared header, single main landmark, and footer around page content.
 */
export function Page({ children, className }: PageProps) {
  return (
    <>
      <Header />
      <main className={className}>{children}</main>
      <Footer />
    </>
  );
}
