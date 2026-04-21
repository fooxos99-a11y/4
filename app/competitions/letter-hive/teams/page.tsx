"use client";

import { useState } from "react";

export default function LetterHiveTeams() {
  const [teamNames, setTeamNames] = useState(["", ""]);

  const handleChange = (index: number, value: string) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/competitions/letter-hive/game?team1=${encodeURIComponent(teamNames[0])}&team2=${encodeURIComponent(teamNames[1])}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-xl w-full mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-[#3453a7] mb-8">خلية الحروف</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-[#1a2332] mb-2 text-lg font-semibold">اسم الفريق 1</label>
            <input
              type="text"
              value={teamNames[0]}
              onChange={e => handleChange(0, e.target.value)}
              required
              placeholder="أدخل اسم الفريق 1"
              className="w-full border border-[#3453a7] rounded-lg px-4 py-3 focus:outline-none focus:border-[#4f73d1] text-right"
            />
          </div>
          <div className="mb-8">
            <label className="block text-[#1a2332] mb-2 text-lg font-semibold">اسم الفريق 2</label>
            <input
              type="text"
              value={teamNames[1]}
              onChange={e => handleChange(1, e.target.value)}
              required
              placeholder="أدخل اسم الفريق 2"
              className="w-full border border-[#3453a7] rounded-lg px-4 py-3 focus:outline-none focus:border-[#4f73d1] text-right"
            />
          </div>
          <button
            type="submit"
            className="w-full font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center text-white transition-all duration-200"
            style={{
              backgroundColor: '#3453a7',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              opacity: 1,
              cursor: 'pointer',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(216,163,85,0.18)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
            }}
          >
            التالي <span style={{ display: 'inline-block', width: 18 }}></span>→
          </button>
        </form>
      </div>
    </div>
  );
}
