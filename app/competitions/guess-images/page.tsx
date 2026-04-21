"use client"


import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import TrophyIcon from "@/components/TrophyIcon";
import { getGuessStages, getGuessImagesByStage } from "@/lib/guess-stages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteLoader } from "@/components/ui/site-loader";

export default function GuessImagesGame() {
  const [step, setStep] = useState<'stage' | 'teams' | 'game'>("stage");
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [answeredTeam, setAnsweredTeam] = useState<number | undefined>(undefined);

  // عند فتح نافذة الإجابة، أعد تعيين answeredTeam
  const handleShowDialog = (open: boolean) => {
    setShowDialog(open);
    if (open) setAnsweredTeam(undefined);
  }

  // جلب المراحل عند أول تحميل
  useEffect(() => {
    if (step === "stage") {
      setLoading(true);
      getGuessStages().then(async (data) => {
        setStages(data);
        setLoading(false);
        // إذا كان هناك مرحلة واحدة فقط، انتقل تلقائياً
        if (data.length === 1) {
          setSelectedStage(data[0]);
          setLoading(true);
          const imgs = await getGuessImagesByStage(data[0].id);
          setImages(imgs);
          setLoading(false);
          setStep("teams");
        }
      });
    }
  }, [step]);

  // جلب الصور عند اختيار المرحلة
  const handleStageSelect = async (stage: any) => {
    setSelectedStage(stage);
    setLoading(true);
    const imgs = await getGuessImagesByStage(stage.id);
    setImages(imgs);
    setLoading(false);
    // إذا كان هناك فريقان محفوظان من قبل، انتقل مباشرة للعبة
    if (team1Name.trim() && team2Name.trim()) {
      setStep("game");
    } else {
      setStep("teams");
    }
  };

  const handleTeamsSubmit = () => {
    if (team1Name.trim() && team2Name.trim()) {
      setStep("game");
    }
  };

  // Game step UI
  const current = images[currentIndex];
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-0">
      <div className="w-full flex flex-col items-center justify-center px-0 py-8" style={{ minHeight: '70vh' }}>
        {/* اختيار المرحلة */}
        {step === 'stage' && (
          <div className="flex flex-col items-center gap-10 w-full">
            <h2 className="text-5xl sm:text-7xl font-black mb-8 text-[#3453a7] tracking-wide drop-shadow-lg">اختر المرحلة</h2>
              <div className="text-2xl text-[#1a2332] font-bold mb-4">اكتشف معنى الصورة قبل الفريق الآخر</div>

            {loading ? (
              <SiteLoader size="lg" />
            ) : (
              <div className="flex flex-wrap gap-8 justify-center">
                {stages.map((stage) => (
                  <Button
                    key={stage.id}
                    className={`px-12 py-8 text-5xl sm:text-7xl rounded-2xl border-4 border-[#3453a7] bg-white text-[#1a2332] font-black shadow-xl hover:bg-[#eef3ff] transition-all ${selectedStage?.id === stage.id ? 'ring-8 ring-[#3453a7]/40' : ''}`}
                    style={{ minWidth: 120, minHeight: 120 }}
                    onClick={() => handleStageSelect(stage)}
                  >
                    {stage.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* تسجيل الفرق */}
        {step === 'teams' && (
          <div className="min-h-screen bg-white flex items-center justify-center w-full p-4">
            <div className="max-w-2xl mx-auto w-full">
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border-2 border-[#3453a7]/20">
                <h2
                  className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-14 mt-4 sm:mt-8 text-[#1a2332] bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent"
                  style={{lineHeight: 1.3, paddingTop: '0.5em', paddingBottom: '0.5em'}}
                >
                  أسماء الفرق
                </h2>
                <form
                  className="space-y-8"
                  onSubmit={e => {
                    e.preventDefault();
                    handleTeamsSubmit();
                  }}
                >
                  <div>
                    <Label htmlFor="team1" className="text-lg font-semibold text-[#1a2332]">اسم الفريق الأول</Label>
                    <Input
                      id="team1"
                      value={team1Name}
                      onChange={e => setTeam1Name(e.target.value)}
                      placeholder="أدخل اسم الفريق الأول"
                      className="mt-3 text-lg border-2 border-[#3453a7]/30 focus:border-[#3453a7] py-3"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="team2" className="text-lg font-semibold text-[#1a2332]">اسم الفريق الثاني</Label>
                    <Input
                      id="team2"
                      value={team2Name}
                      onChange={e => setTeam2Name(e.target.value)}
                      placeholder="أدخل اسم الفريق الثاني"
                      className="mt-3 text-lg border-2 border-[#3453a7]/30 focus:border-[#3453a7] py-3"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!team1Name.trim() || !team2Name.trim()}
                    className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-xl py-6 shadow-lg mt-6"
                  >
                    بدء اللعبة
                    <ArrowRight className="mr-2 inline" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* السبورة واللعبة */}
        {step === 'game' && (
          <>
            {/* أسماء الفرق فوق السبورة */}
            <div className="flex w-full max-w-7xl justify-between items-center mb-2 px-8">
              <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-[#f4f7ff] to-[#eef3ff] border-2 border-[#3453a7] rounded-xl shadow-md px-4 py-2 text-2xl font-extrabold text-[#1a2332] text-center min-w-[180px]" style={{ fontSize: '1.5rem' }}>{team2Name}</div>
                <div className="flex items-center justify-center bg-[#3453a7] text-white rounded-lg px-2 py-2 text-xl font-extrabold w-full text-center shadow mt-2 gap-0" style={{minWidth:120}}>
                  <Button size="icon" variant="ghost" className="text-white !w-10 !h-10" onClick={() => setTeam2Score(s => s + 1)} title="إضافة" style={{order:1}}>
                    <span style={{fontSize:'1.5em',lineHeight:1}}>+</span>
                  </Button>
                  <span className="mx-4 text-2xl font-bold select-none" style={{minWidth:32, textAlign:'center', order:2}}>{team2Score}</span>
                  <Button size="icon" variant="ghost" className="text-white !w-10 !h-10" onClick={() => setTeam2Score(s => s - 1)} disabled={team2Score <= 0} title="إنقاص" style={{order:3}}>
                    <span style={{fontSize:'1.5em',lineHeight:1}}>-</span>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-gradient-to-br from-[#f4f7ff] to-[#eef3ff] border-2 border-[#3453a7] rounded-xl shadow-md px-4 py-2 text-2xl font-extrabold text-[#1a2332] text-center min-w-[180px]" style={{ fontSize: '1.5rem' }}>{team1Name}</div>
                <div className="flex items-center justify-center bg-[#3453a7] text-white rounded-lg px-2 py-2 text-xl font-extrabold w-full text-center shadow mt-2 gap-0" style={{minWidth:120}}>
                  <Button size="icon" variant="ghost" className="text-white !w-10 !h-10" onClick={() => setTeam1Score(s => s + 1)} title="إضافة" style={{order:1}}>
                    <span style={{fontSize:'1.5em',lineHeight:1}}>+</span>
                  </Button>
                  <span className="mx-4 text-2xl font-bold select-none" style={{minWidth:32, textAlign:'center', order:2}}>{team1Score}</span>
                  <Button size="icon" variant="ghost" className="text-white !w-10 !h-10" onClick={() => setTeam1Score(s => s - 1)} disabled={team1Score <= 0} title="إنقاص" style={{order:3}}>
                    <span style={{fontSize:'1.5em',lineHeight:1}}>-</span>
                  </Button>
                </div>
              </div>
            </div>
            {/* السبورة */}
            <div className="flex flex-col items-center justify-center w-full flex-1">
              <div className="bg-white border-4 border-[#3453a7] rounded-3xl shadow-2xl flex items-center justify-center w-full max-w-7xl h-[380px] sm:h-[440px] mb-4 overflow-hidden" style={{aspectRatio: '16/7'}}>
                {current?.image_url ? (
                  <img src={current.image_url} alt="صورة التخمين" className="object-contain w-full h-full" style={{maxWidth: '100%', maxHeight: '100%'}} />
                ) : (
                  <span className="text-gray-400">لا توجد صورة</span>
                )}
              </div>
              <div className="w-full flex flex-col items-center">
                <Button
                  className="bg-[#3453a7] text-white text-2xl font-bold px-16 py-6 rounded-2xl shadow mb-2"
                  onClick={() => handleShowDialog(true)}
                >
                  الإجابة
                </Button>
                <Dialog open={showDialog} onOpenChange={handleShowDialog}>
                  <DialogContent showCloseButton={false} className="max-w-md" style={{ direction: 'rtl', textAlign: 'right' }}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl text-center">الإجابة</DialogTitle>
                      <div className="text-lg text-[#1a2332] font-semibold mb-2 w-full text-center" style={{direction: 'rtl'}}>
                        اكتشف معنى الصورة قبل الفريق الآخر
                      </div>
                    </DialogHeader>
                    <div className="text-center text-2xl font-bold my-4 text-[#3453a7]">{current?.answer}</div>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="text-center font-semibold mb-1 text-lg">من الفريق الذي أجاب؟</div>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => {
                          setTeam1Score(s => s + 1);
                          setShowDialog(false);
                          setAnsweredTeam(undefined);
                          setTimeout(() => {
                            setCurrentIndex(i => i + 1);
                          }, 100);
                        }} className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white font-bold px-8 py-3 rounded-xl text-lg shadow">{team1Name}</Button>
                        <Button onClick={() => {
                          setTeam2Score(s => s + 1);
                          setShowDialog(false);
                          setAnsweredTeam(undefined);
                          setTimeout(() => {
                            setCurrentIndex(i => i + 1);
                          }, 100);
                        }} className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white font-bold px-8 py-3 rounded-xl text-lg shadow">{team2Name}</Button>
                        <Button onClick={() => {
                          setShowDialog(false);
                          setAnsweredTeam(undefined);
                          setTimeout(() => {
                            setCurrentIndex(i => i + 1);
                          }, 100);
                        }} className="bg-red-400 text-white font-bold px-8 py-3 rounded-xl text-lg shadow">محد جاوب</Button>
                      </div>
                      {typeof answeredTeam !== 'undefined' && (
                        <div className="flex justify-center mt-4">
                          <Button onClick={() => {
                            setShowDialog(false);
                            setAnsweredTeam(undefined);
                            setTimeout(() => {
                              setCurrentIndex(i => i + 1);
                            }, 100);
                          }} className="bg-[#3453a7] text-white font-bold px-8 py-3 rounded-xl text-lg shadow text-xl">التالي</Button>
                        </div>
                      )}
                  </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            {/* نافذة الفوز - تصميم المزاد */}
            {currentIndex >= images.length && (
              <div className="min-h-screen fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-12 border-2 border-[#3453a7]/30 text-center flex flex-col items-center">
                  <TrophyIcon />
                  <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent" style={{lineHeight:1.2, paddingBottom:'0.2em'}}>مبروك!</h1>
                  {team1Score === team2Score ? (
                    <p className="text-2xl font-bold text-[#1a2332] mb-4">تعادل بين الفريقين!</p>
                  ) : (
                    <>
                      <div className="text-5xl sm:text-6xl font-black text-[#3453a7] mb-2 mt-4">{team1Score > team2Score ? team1Name : team2Name}</div>
                      <div className="text-2xl font-bold text-[#1a2332] mb-4">{(team1Score === team2Score ? team1Score : Math.max(team1Score, team2Score)).toLocaleString()}</div>
                    </>
                  )}
                  <div className="space-y-4 w-full max-w-md mx-auto mt-4">
                    <h3 className="text-2xl font-bold text-[#1a2332] mb-4">النتائج النهائية:</h3>
                    {[{name: team1Name, score: team1Score}, {name: team2Name, score: team2Score}]
                      .sort((a, b) => b.score - a.score)
                      .map((team, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-xl p-4 mb-2">
                          <span className="text-xl font-bold text-[#1a2332]">{idx + 1}. {team.name}</span>
                          <span className="text-2xl font-black text-[#3453a7]">{team.score.toLocaleString()}</span>
                        </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full">
                    <Button
                      onClick={() => window.location.reload()}
                      className="flex-1 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl py-6"
                    >
                      <svg className="inline w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M4.93 19.07A10 10 0 1 1 12 22v-4m0 4 3-3m-3 3-3-3"/></svg>
                      لعب مرة أخرى
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-xl py-6 flex items-center justify-center gap-2"
                    >
                      <TrophyIcon className="w-5 h-5 mr-1" /> خروج
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
