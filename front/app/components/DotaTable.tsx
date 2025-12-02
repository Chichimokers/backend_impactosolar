'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type PlayerInfo = {
  steam_id: string;
  mmr_estimate: number | null;
  rank_tier: number | null;
  profile: string | null;
  avatar: string | null;
  error?: string;
};

const estimateMMR = (rank_tier?: number | null): string => {
  if (!rank_tier) return 'Unranked or Private';

  const medal = Math.floor(rank_tier / 10);
  const stars = rank_tier % 10;

  const baseMMR: Record<number, number> = {
    1: 0,     // Herald
    2: 770,   // Guardian
    3: 1540,  // Crusader
    4: 2310,  // Archon
    5: 3080,  // Legend
    6: 3850,  // Ancient
    7: 4620,  // Divine
    8: 5420   // Immortal
  };

  if (!baseMMR[medal]) return 'Unranked or Private';

  const mmrPerStar = 154;
  const effectiveStars = Math.min(stars, medal === 7 ? 7 : 5);
  const estimatedMMR = baseMMR[medal] + (effectiveStars * mmrPerStar);

  return `${estimatedMMR}+`;
};

export default function DotaTable() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    fetch('https://inventory.cloudns.be/apidota/dota-info')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.results || []);
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  console.log(players)
  const filteredPlayers = players.filter(p => {
    if (!p.profile) return false;
    return p.profile.toLowerCase().includes(filter.toLowerCase());
  });


  const sortedPlayers = filteredPlayers.sort((a, b) => {
    const mmrA = a.rank_tier ?? 0;
    const mmrB = b.rank_tier ?? 0;
    return mmrB - mmrA;
  });

 
  const pageCount = Math.ceil(sortedPlayers.length / itemsPerPage);

  const paginatedPlayers = sortedPlayers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getMedalComponents = (rank_tier?: number | null) => {
    if (!rank_tier) return { medal: 0, stars: 0 };
    const medal = Math.floor(rank_tier / 10);
    const stars = rank_tier % 10;
    return { medal, stars };
  };

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Filtrar por nombre..."
        value={filter}
        onChange={e => {
          setFilter(e.target.value);
          setPage(1);
        }}
        className="mb-4 w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
      />

      {loading ? (
        <p className="text-center text-white">Cargando jugadores...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 text-white rounded-lg overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 text-left">Jugador</th>
                  <th className="p-3 text-left">MMR</th>
                  <th className="p-3 text-left">Medalla</th>
                  <th className="p-3 text-left">Avatar</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.length > 0 ? (
                  paginatedPlayers.map((p) => {
                    const { medal, stars } = getMedalComponents(p.rank_tier);
                    const isValidMedal = medal >= 1 && medal <= 8;
                    const isValidStar = stars >= 1 && stars <= 7;

                    return (
                      <tr
                        key={p.steam_id}
                        className="border-t border-gray-600 hover:bg-gray-700"
                      >
                        <td className="p-3">{p.profile}</td>
                        <td className="p-3">
                          {p.mmr_estimate
                            ? p.mmr_estimate
                            : estimateMMR(p.rank_tier)}
                        </td>
                        <td className="p-3">
                          <div className="relative w-20 h-20">
                            {isValidMedal ? (
                              <>
                                <Image
                                  src={`https://inventory.cloudns.be/ranking/medals/medal_${medal}.png`}
                                  alt="base medal"
                                  fill
                                  className="object-contain"
                                />
                                {isValidStar && (
                                  <Image
                                    src={`https://inventory.cloudns.be/ranking/medals/star_${stars}.png`}
                                    alt="stars"
                                    fill
                                    className="object-contain"
                                  />
                                )}
                              </>
                            ) : (
                            <h1>Unrakend or Private</h1>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {p.avatar ? (
                            <div className="relative w-20 h-20">
                              <Image
                                src={p.avatar}
                                alt="avatar"
                                fill
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            'No disponible'
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-400">
                      No se encontraron jugadores
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pageCount > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                Anterior
              </button>

              {[...Array(pageCount)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    page === i + 1 ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
