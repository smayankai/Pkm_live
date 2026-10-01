"use client";

import { useState } from "react";
import Link from "next/link";

type Player = {
  id: string;
  name: string;
};

export default function PlayerSearch({
  players,
}: {
  players: Player[];
}) {
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0d0d10] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/40 focus:bg-[#111114]"
        />
      </div>

      {/* Result count */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {filteredPlayers.length}{" "}
          {filteredPlayers.length === 1 ? "player" : "players"}
        </p>

        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Players */}
      {filteredPlayers.length > 0 ? (
        <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10]">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="group flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-zinc-400 transition group-hover:bg-yellow-400 group-hover:text-black">
                  {player.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    {player.name}
                  </h2>

                  <p className="mt-0.5 text-xs text-zinc-600">
                    View player profile
                  </p>
                </div>
              </div>

              <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-yellow-400">
                →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0d10] px-6 py-12 text-center">
          <p className="font-medium text-zinc-400">
            No players found
          </p>

          <p className="mt-1 text-sm text-zinc-600">
            Try searching for a different player name.
          </p>
        </div>
      )}
    </div>
  );
}