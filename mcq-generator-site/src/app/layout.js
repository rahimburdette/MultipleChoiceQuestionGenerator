import './globals.css';

export const metadata = {
  title: 'MCQ Generator — USMLE-Style Practice Questions',
  description: 'Generate NBME-aligned, USMLE-style multiple-choice questions from your learning objectives. Built for UVA medical students.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
