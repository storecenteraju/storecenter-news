import React from 'react';

const resellerUrl = 'https://ton.com.br/catalogo/?referrer=0924CA71-38E5-4B8E-8B7F-BFD628370646&userAnticipation=0&utm_medium=invite_share&utm_source=revendedor';

export default function TonBanner({ placement }: { placement: 'top' | 'middle' }) {
  const top = placement === 'top';
  return (
    <div className="w-full flex flex-col items-center gap-1">
      <span className="text-[9px] text-slate-400 uppercase tracking-widest">Publicidade</span>
      <a
        href={resellerUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label="Adquira sua maquininha Ton com condições especiais — abre em nova aba"
        className="block w-full max-w-[728px] overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <img
          src={top ? '/assets/ads/ton-revendedor-topo.png' : '/assets/ads/ton-revendedor-materia.png'}
          alt="Adquira sua maquininha com condições especiais"
          width={top ? 1983 : 2048}
          height={top ? 411 : 395}
          loading={top ? 'eager' : 'lazy'}
          decoding="async"
          className="block w-full h-auto"
        />
      </a>
    </div>
  );
}
