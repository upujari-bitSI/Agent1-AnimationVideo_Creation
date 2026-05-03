"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export const THEMES = [
  { id: "daily-routines", label: "Daily Routines", emoji: "☀️" },
  { id: "animals",        label: "Animals",        emoji: "🐾" },
  { id: "colors-numbers", label: "Colors & Numbers",emoji: "🎨" },
  { id: "emotions",       label: "Emotions",       emoji: "😊" },
  { id: "seasons",        label: "Seasons",        emoji: "🍂" },
  { id: "body-parts",     label: "Body Parts",     emoji: "🖐" },
  { id: "food",           label: "Food",           emoji: "🍎" },
  { id: "bedtime",        label: "Bedtime",        emoji: "🌙" },
];

interface TitleOption {
  title: string;
  emoji: string;
  ageRange: string;
  hook: string;
  engagementScore: number;
}

interface Props {
  selectedThemes: string[];
  onThemeToggle: (id: string) => void;
  titles: TitleOption[];
  selectedTitle: TitleOption | null;
  onSelectTitle: (t: TitleOption) => void;
}

export default function TopicSelector({ selectedThemes, onThemeToggle, titles, selectedTitle, onSelectTitle }: Props) {
  return (
    <div className="space-y-5">
      {/* Theme pills */}
      <div>
        <p className="text-sm text-slate-400 mb-2 font-semibold">Select up to 3 themes:</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => {
            const active = selectedThemes.includes(t.id);
            const maxed = selectedThemes.length >= 3 && !active;
            return (
              <button
                key={t.id}
                onClick={() => !maxed && onThemeToggle(t.id)}
                disabled={maxed}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all
                  ${active
                    ? "bg-blue-600 border-blue-400 text-white"
                    : maxed
                    ? "bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed"
                    : "bg-slate-800/60 border-slate-600/40 text-slate-300 hover:border-blue-500/50 hover:text-white"}`}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title cards */}
      {titles.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-3 font-semibold">Choose a title:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {titles.map((t, i) => {
              const isSelected = selectedTitle?.title === t.title;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelectTitle(t)}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                    ${isSelected
                      ? "border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xl">{t.emoji}</span>
                      <h3 className="mt-1 font-bold text-white text-sm leading-snug" style={{ fontFamily: "var(--font-fredoka)" }}>
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{t.ageRange}</span>
                      <div className="mt-1 text-xs text-amber-300 font-bold">⭐ {t.engagementScore}/10</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{t.hook}</p>
                  {isSelected && (
                    <div className="mt-2 text-xs text-blue-300 font-semibold">✓ Selected</div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
