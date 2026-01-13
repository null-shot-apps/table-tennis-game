'use client';

import dynamic from 'next/dynamic';

const TableTennisGame = dynamic(() => import('./game'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      Loading game...
    </div>
  ),
});

export default function Page() {
  return <TableTennisGame />;
}


