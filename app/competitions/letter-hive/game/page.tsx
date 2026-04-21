"use client";

export const dynamic = "force-dynamic";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { SiteLoader } from "@/components/ui/site-loader";
import { createClient } from "@/lib/supabase/client";

// قائمة الحروف الأساسية
const BASE_LETTERS = [
  "ص","ح","خ","م","د","ز","ع","و","هـ","ط",
  "ج","ض","ل","ك","ي","س","أ","ت","ش","ق",
  "ر","ن","غ","ف","ب"
];

type LetterHiveQuestion = {
  id: string;
  letter: string;
  question: string;
  answer: string;
};

type LetterHiveProgress = {
  id: string | null;
  lastQuestionIndex: number;
};

const shuffleArray = (array: string[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

function getNeighbors(i: number): number[] {
  const row = Math.floor(i / 5), col = i % 5, neighbors: number[] = [];
  const checks: [number, number][] = row % 2 === 0 ?
    [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]] :
    [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];
  checks.forEach(([dr, dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) neighbors.push(nr * 5 + nc);
  });
  return neighbors;
}

// مكون المحتوى الذي يستخدم useSearchParams
function GameContent() {
  const searchParams = useSearchParams();
  const team1 = searchParams?.get("team1") || "الأحمر";
  const team2 = searchParams?.get("team2") || "الأخضر";

  const [scoreRed, setScoreRed] = useState(0);
  const [scoreGreen, setScoreGreen] = useState(0);
  const [hexes, setHexes] = useState<(null | "red" | "green")[]>(Array(25).fill(null));
  const [randomLetters, setRandomLetters] = useState<string[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [targetHex, setTargetHex] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [currentQuestionDebugIdx, setCurrentQuestionDebugIdx] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [questionsByLetter, setQuestionsByLetter] = useState<Record<string, LetterHiveQuestion[]>>({});
  const [progressByLetter, setProgressByLetter] = useState<Record<string, LetterHiveProgress>>({});
  const [boardLoading, setBoardLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);

  const accountNumber = Number(searchParams?.get("account") || 1);

  useEffect(() => {
    setRandomLetters(shuffleArray(BASE_LETTERS));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const preloadGameData = async () => {
      setBoardLoading(true);

      try {
        const supabase = createClient();
        const [{ data: questions, error: questionsError }, { data: progressRows, error: progressError }] = await Promise.all([
          supabase.from("letter_hive_questions").select("id,letter,question,answer").order("id", { ascending: true }),
          supabase
            .from("letter_hive_progress")
            .select("id,letter,last_question_index")
            .eq("account_number", accountNumber),
        ]);

        if (!isMounted) {
          return;
        }

        if (questionsError) {
          console.error("Error fetching letter hive questions:", questionsError);
          setQuestionsByLetter({});
        } else {
          const groupedQuestions = (questions || []).reduce<Record<string, LetterHiveQuestion[]>>((acc, row) => {
            if (!acc[row.letter]) {
              acc[row.letter] = [];
            }
            acc[row.letter].push(row);
            return acc;
          }, {});
          setQuestionsByLetter(groupedQuestions);
        }

        if (progressError) {
          console.error("Error fetching letter hive progress:", progressError);
          setProgressByLetter({});
        } else {
          const progressMap = (progressRows || []).reduce<Record<string, LetterHiveProgress>>((acc, row) => {
            acc[row.letter] = {
              id: row.id,
              lastQuestionIndex: row.last_question_index,
            };
            return acc;
          }, {});
          setProgressByLetter(progressMap);
        }
      } finally {
        if (isMounted) {
          setBoardLoading(false);
        }
      }
    };

    preloadGameData();

    return () => {
      isMounted = false;
    };
  }, [accountNumber]);

  const persistProgress = async (letter: string, nextIndex: number, progressId: string | null) => {
    try {
      const supabase = createClient();

      if (progressId) {
        const { error } = await supabase
          .from("letter_hive_progress")
          .update({ last_question_index: nextIndex, updated_at: new Date().toISOString() })
          .eq("id", progressId);

        if (error) {
          console.error("Error updating letter hive progress:", error);
        }

        return;
      }

      const { data, error } = await supabase
        .from("letter_hive_progress")
        .insert({ account_number: accountNumber, letter, last_question_index: nextIndex })
        .select("id")
        .single();

      if (error) {
        console.error("Error inserting letter hive progress:", error);
        return;
      }

      if (data?.id) {
        setProgressByLetter((prev) => ({
          ...prev,
          [letter]: {
            id: data.id,
            lastQuestionIndex: nextIndex,
          },
        }));
      }
    } catch (error) {
      console.error("Error persisting letter hive progress:", error);
    }
  };

  const handleHexClick = async (i: number) => {
    if (hexes[i] || showWinModal || boardLoading || questionLoading) return;

    setTargetHex(i);
    setShowQuestionModal(true);
    setQuestionLoading(true);
    setShowAnswer(false);
    setCurrentAnswer(null);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(null);
    setCurrentQuestionDebugIdx(null);

    const letter = randomLetters[i];
    const questions = questionsByLetter[letter] || [];

    if (questions.length === 0) {
      setCurrentQuestion("لا يوجد سؤال لهذا الحرف بعد.");
      setCurrentAnswer(null);
      setCurrentQuestionIndex(null);
      setCurrentQuestionDebugIdx(null);
      setQuestionLoading(false);
      return;
    }

    const progressEntry = progressByLetter[letter];
    const nextIndex = progressEntry ? (progressEntry.lastQuestionIndex + 1) % questions.length : 0;
    const nextQuestion = questions[nextIndex];

    setCurrentQuestion(nextQuestion.question);
    setCurrentAnswer(nextQuestion.answer);
    setCurrentQuestionIndex(nextQuestion.id || null);
    setCurrentQuestionDebugIdx(nextIndex);
    setProgressByLetter((prev) => ({
      ...prev,
      [letter]: {
        id: progressEntry?.id || null,
        lastQuestionIndex: nextIndex,
      },
    }));
    setQuestionLoading(false);

    void persistProgress(letter, nextIndex, progressEntry?.id || null);
  };

  const handleShowAnswer = () => setShowAnswer(true);
  const handleAnswered = () => {
    setShowQuestionModal(false);
    setShowTeamModal(true);
  };

  const assignColor = (color: "red" | "green") => {
    if (targetHex === null) return;
    const newHexes = [...hexes];
    newHexes[targetHex] = color;
    setHexes(newHexes);
    setShowTeamModal(false);
    setTargetHex(null);
    checkWinner(color, newHexes);
  };

  const checkWinner = (color: "red" | "green", hexArr: (null | "red" | "green")[]) => {
    const owned: number[] = hexArr.map((h, i) => h === color ? i : null).filter((i): i is number => i !== null);
    let startNodes: number[] = [], targets = new Set<number>();
    
    if (color === "red") {
      startNodes = owned.filter((i) => i % 5 === 0);
      owned.filter((i) => i % 5 === 4).forEach((i) => targets.add(i));
    } else {
      startNodes = owned.filter((i) => i < 5);
      owned.filter((i) => i >= 20).forEach((i) => targets.add(i));
    }

    let q = [...startNodes], visited = new Set<number>(startNodes);
    while (q.length > 0) {
      let curr = q.shift();
      if (curr !== undefined && targets.has(curr)) {
        showWin(color);
        return;
      }
      getNeighbors(curr!).forEach((n) => {
        if (owned.includes(n) && !visited.has(n)) {
          visited.add(n); q.push(n);
        }
      });
    }
  };

  const showWin = (color: "red" | "green") => {
    if (color === "red") {
      setScoreRed(s => s + 1);
      setWinMessage(`فاز الفريق ${team1}!`);
    } else {
      setScoreGreen(s => s + 1);
      setWinMessage(`فاز الفريق ${team2}!`);
    }
    setShowWinModal(true);
  };

  const resetGame = () => {
    setHexes(Array(25).fill(null));
    setRandomLetters(shuffleArray(BASE_LETTERS));
    setShowWinModal(false);
  };

  const TeamScoreCard = ({ name, score, color, side }: { name: string, score: number, color: string, side: 'left' | 'right' }) => (
    <div style={{
      flex: "0 0 180px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      padding: "30px 20px",
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(10px)",
      borderRadius: side === 'left' ? "50px 15px 15px 50px" : "15px 50px 50px 15px",
      border: `2px solid ${color}`,
      boxShadow: `0 15px 35px -5px ${color}33`,
      position: "relative",
      transition: "all 0.3s ease"
    }}>
      <div style={{
        position: "absolute",
        top: "-15px",
        background: color,
        color: "white",
        padding: "4px 15px",
        borderRadius: "20px",
        fontSize: "0.9rem",
        fontWeight: "bold",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
      }}>
        {side === 'left' ? 'الفريق الثاني' : 'الفريق الأول'}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#444", marginTop: "10px" }}>{name}</div>
      <div style={{ 
        fontSize: "4.5rem", 
        fontWeight: "900", 
        color: color,
        lineHeight: "1",
        textShadow: "2px 2px 0px rgba(0,0,0,0.05)"
      }}>
        {score}
      </div>
      <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: "bold" }}>نقطة</div>
    </div>
  );

  const renderHexGrid = () => {
    return hexes.map((status, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = col * 100 + (row % 2 === 0 ? 0 : 50);
      const y = row * 87;

      return (
        <g key={i} transform={`translate(${x},${y})`} onClick={() => handleHexClick(i)} style={{ cursor: status ? "default" : "pointer" }}>
          <polygon
            points="50,0 100,29 100,87 50,116 0,87 0,29"
            fill={status === "red" ? "#df103a" : status === "green" ? "#10dfb5" : "#ffffff"}
            stroke="#2c3e50"
            strokeWidth={3}
            style={{ transition: "fill 0.3s ease" }}
          />
          <text
            x="50"
            y="58"
            style={{
              fontSize: 38,
              fontWeight: "bold",
              fill: status === "red" ? "#ffffff" : status === "green" ? "#ffffff" : "#2c3e50",
              pointerEvents: "none",
              dominantBaseline: "middle",
              textAnchor: "middle",
              fontFamily: "Arial"
            }}
          >
            {randomLetters[i]}
          </text>
        </g>
      );
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative" }}>
      
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "absolute", top: "20px", right: "20px", zIndex: 50 }}
      >
        <div style={{
          width: "24px", height: "24px", background: "#F5F5DC", border: "2px solid #d2d2b4", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#8b8b7a",
          cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", transition: "transform 0.2s ease"
        }}>
          {"!"}
        </div>
        {isHovered && (
          <div style={{
            position: "absolute", top: "30px", right: "0", whiteSpace: "nowrap", background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(5px)", padding: "8px 15px", borderRadius: "12px", border: "1px solid #d2d2b4",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)", fontSize: "0.85rem", color: "#555", fontWeight: "bold"
          }}>
            اضغط على زر <span style={{ color: "#2c3e50" }}>F11</span> لملء الشاشة
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "1300px", gap: "40px" }}>
        <TeamScoreCard name={team2} score={scoreGreen} color="#10dfb5" side="left" />
        <div style={{ flex: "1", position: "relative", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "650px", filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.1))" }}>
            <svg viewBox="-70 -70 690 605" style={{ width: "100%", height: "auto", overflow: "visible" }}>
              <foreignObject x="-80" y="-80" width="710" height="624">
                <div style={{
                  width: '100%', height: '100%', borderRadius: '30px',
                  background: 'conic-gradient(from -45deg, #10dfb5 90deg, #df103a 90deg 180deg, #10dfb5 180deg 270deg, #df103a 270deg)',
                  boxShadow: 'inset 0 0 0 5px rgba(0,0,0,0.05)'
                }} />
              </foreignObject>
              <line x1="-50" y1="232" x2="600" y2="232" stroke="rgba(0,0,0,0.1)" strokeWidth="2" strokeDasharray="10,10" />
              {renderHexGrid()}
            </svg>
          </div>
          {boardLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.01)",
                borderRadius: "24px",
                pointerEvents: "auto",
              }}
            />
          )}
        </div>
        <TeamScoreCard name={team1} score={scoreRed} color="#df103a" side="right" />
      </div>

      {showQuestionModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110
          }}
          onClick={() => setShowQuestionModal(false)}
        >
          <div
            style={{
              background: "white", padding: "40px 30px", borderRadius: "25px", textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320
            }}
            onClick={e => e.stopPropagation()}
          >
            {questionLoading ? (
              <div style={{ minWidth: 280, minHeight: 80 }} />
            ) : (
              <>
                <h3 style={{ marginBottom: 24, fontSize: "1.3rem", color: "#2c3e50" }}>{currentQuestion}</h3>
            {!showAnswer && currentAnswer && (
              <button onClick={handleShowAnswer} style={{ padding: "14px 40px", background: "#2c3e50", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", marginBottom: 16, marginTop: 32 }}>الإجابة</button>
            )}
            {showAnswer && currentAnswer && (
              <>
                <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{currentAnswer}</div>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: 32 }}>
                  <button onClick={() => { setShowQuestionModal(false); setShowTeamModal(true); assignColor("red"); }} style={{ padding: "14px 40px", background: "#df103a", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem" }}>{team1}</button>
                  <button onClick={() => { setShowQuestionModal(false); setShowTeamModal(true); assignColor("green"); }} style={{ padding: "14px 40px", background: "#10dfb5", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem" }}>{team2}</button>
                </div>
              </>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {showTeamModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100
          }}
          onClick={() => setShowTeamModal(false)}
        >
          <div
            style={{
              background: "white", padding: "40px", borderRadius: "25px", textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "25px", fontSize: "1.5rem", color: "#333" }}>اختر الفريق صاحب الإجابة:</h3>
            <div style={{ display: "flex", gap: "20px", flexDirection: 'row-reverse', justifyContent: 'center' }}>
              <button onClick={() => assignColor("green")} style={{ padding: "15px 40px", background: "#10dfb5", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team2}</button>
              <button onClick={() => assignColor("red")} style={{ padding: "15px 40px", background: "#df103a", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team1}</button>
            </div>
          </div>
        </div>
      )}

      {showWinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <div style={{ background: "white", padding: "50px", borderRadius: "30px", textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "5rem", marginBottom: "10px" }}>🏆</div>
            <h1 style={{ fontSize: "2.2rem", color: "#2c3e50", marginBottom: "10px" }}>انتهت الجولة!</h1>
            <p style={{ fontSize: "1.5rem", color: "#666", marginBottom: "30px" }}>{winMessage}</p>
            <button onClick={resetGame} style={{ width: "100%", padding: "15px", background: "#2c3e50", color: "white", border: "none", borderRadius: "15px", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold", marginBottom: "16px" }}>لعب مرة أخرى</button>
            <button onClick={() => window.location.href = "/competitions"} style={{ width: "100%", padding: "13px", background: "#3453a7", color: "#fff", border: "none", borderRadius: "15px", fontSize: "1.1rem", cursor: "pointer", fontWeight: "bold" }}>العودة للرئيسية</button>
          </div>
        </div>
      )}
    </div>
  );
}

// التصدير الأساسي مغلف بـ Suspense
export default function LetterHiveGame() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SiteLoader size="lg" /></div>}>
      <GameContent />
    </Suspense>
  );
}
