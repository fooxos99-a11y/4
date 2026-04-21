const fs = require('fs');
const content = "use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { SiteLoader } from "@/components/ui/site-loader";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Trophy, BookOpen, Users, Activity, Orbit, Percent, ChevronDown } from "lucide-react";
import { calculateTotalEvaluationPoints, applyAttendancePointsAdjustment } from "@/lib/student-attendance";

export default function StatisticsPage() {
  const [dateFilter, setDateFilter] = useState("month");
  const [loading, setLoading] = useState(true);
  
  const [counts, setCounts] = useState({ circles: 0, students: 0 });
  const [totals, setTotals] = useState({ memorized: 0, revised: 0, tied: 0 });
  
  const [topMemorizers, setTopMemorizers] = useState<any[]>([]);
  const [topRevisers, setTopRevisers] = useState<any[]>([]);
  const [topCircles, setTopCircles] = useState<any[]>([]);
  const [topOverall, setTopOverall] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    
    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'today') {
      startDate = new Date(now);
    } else if (dateFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateFilter === 'semester') {
      startDate.setMonth(now.getMonth() - 6);
    } else {
      // all
      startDate = new Date(2020, 0, 1);
    }
    
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" });
    const startStr = formatter.format(startDate);
    const endStr = formatter.format(now);

    try {
      const { count: circlesCount } = await supabase.from('circles').select('*', { count: 'exact', head: true });
      const { count: studentsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
      setCounts({ circles: circlesCount || 0, students: studentsCount || 0 });

      const { data: users } = await supabase.from('users').select('id, name').eq('role', 'student');
      const usersMap = new Map((users || []).map((u: any) => [u.id, u.name]));
      
      const { data: plans } = await supabase.from('student_plans').select('student_id, daily_pages, muraajaa_pages, rabt_pages');
      const plansMap = new Map();
      (plans || []).forEach((p: any) => {
         plansMap.set(p.student_id, p);
      });

      let query = supabase.from('attendance_records').select(\
        id, student_id, halaqah, date, status,
        evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
      \);
      
      if (dateFilter !== 'all') {
         query = query.gte('date', startStr).lte('date', endStr);
      }
      
      const { data: attendance } = await query;
      
      let aggMemo = 0;
      let aggRev = 0;
      let aggTied = 0;
      
      const studentStats = new Map();
      const circleStats = new Map();
      
      (attendance || []).forEach((record: any) => {
         const sId = record.student_id;
         if (!studentStats.has(sId)) {
             studentStats.set(sId, { id: sId, name: usersMap.get(sId) || '??? ?????', memorized: 0, revised: 0, tied: 0, maxPoints: 0, earnedPoints: 0 });
         }
         
         const cName = record.halaqah || '??? ????';
         if (!circleStats.has(cName)) {
             if (cName !== '??? ????') {
                 circleStats.set(cName, { name: cName, maxPoints: 0, earnedPoints: 0, totalAttend: 0, totalRecords: 0, memorized: 0 });
             }
         }
         
         const sStat = studentStats.get(sId);
         const cStat = circleStats.get(cName);
         
         if (cStat) cStat.totalRecords += 1;
         
         const plan = plansMap.get(sId) || { daily_pages: 1, muraajaa_pages: 20, rabt_pages: 10 };
         
         const isPresent = (record.status === 'present' || record.status === 'late');
         if (isPresent) {
             if (cStat) cStat.totalAttend += 1;
             
             const evArray = record.evaluations || [];
             const ev = Array.isArray(evArray) ? (evArray[0] || {}) : (evArray || {});
             
             sStat.maxPoints += 40;
             if (cStat) cStat.maxPoints += 40;
             
             const validLevels = ['excellent', 'very_good', 'good'];
             
             if (validLevels.includes(ev.hafiz_level)) {
                 sStat.memorized += Number(plan.daily_pages) || 0;
                 if (cStat) cStat.memorized += Number(plan.daily_pages) || 0;
                 aggMemo += Number(plan.daily_pages) || 0;
             }
             if (validLevels.includes(ev.samaa_level)) {
                 sStat.revised += Number(plan.muraajaa_pages) || 0;
                 aggRev += Number(plan.muraajaa_pages) || 0;
             }
             if (validLevels.includes(ev.rabet_level)) {
                 sStat.tied += Number(plan.rabt_pages) || 0;
                 aggTied += Number(plan.rabt_pages) || 0;
             }
             
             const evPoints = calculateTotalEvaluationPoints(ev);
             const finalPts = applyAttendancePointsAdjustment(evPoints, record.status);
             
             sStat.earnedPoints += finalPts;
             if (cStat) cStat.earnedPoints += finalPts;
         } else {
             sStat.maxPoints += 40; // Penalty via larger denominator for absences
             if (cStat) cStat.maxPoints += 40;
         }
      });
      
      setTotals({ memorized: aggMemo, revised: aggRev, tied: aggTied });
      
      const sArray = Array.from(studentStats.values());
      const cArray = Array.from(circleStats.values());
      
      sArray.forEach((s: any) => {
          s.percent = s.maxPoints > 0 ? (s.earnedPoints / s.maxPoints) * 100 : 0;
      });
      cArray.forEach((c: any) => {
          c.evalPercent = c.maxPoints > 0 ? (c.earnedPoints / c.maxPoints) * 100 : 0;
          c.attendPercent = c.totalRecords > 0 ? (c.totalAttend / c.totalRecords) * 100 : 0;
      });

      setTopMemorizers([...sArray].sort((a,b) => b.memorized - a.memorized).slice(0, 10));
      setTopRevisers([...sArray].sort((a,b) => b.revised - a.revised).slice(0, 10));
      setTopOverall([...sArray].sort((a,b) => b.percent - a.percent).slice(0, 10));
      setTopCircles([...cArray].sort((a,b) => (b.evalPercent + b.attendPercent) - (a.evalPercent + a.attendPercent)).slice(0, 5));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          
          <div className="border-b border-[#D4AF37]/50 pb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#1a2332]">?????????? ????????</h1>
            <select
              className="border border-[#D4AF37] rounded-md p-2 bg-white text-sm outline-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">?????</option>
              <option value="week">??????? ??????</option>
              <option value="month">????? ??????</option>
              <option value="semester">????? ??????</option>
              <option value="all">????</option>
            </select>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center"><SiteLoader size="lg" /></div>
          ) : (
            <>
              {/* ??????? ????? - ?????? ????? ????? ????? ???? ???????? */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 mb-1">??????</span>
                  <span className="text-xl md:text-2xl font-bold text-[#1a2332]">{counts.students}</span>
                </div>
                <div className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 mb-1">???????</span>
                  <span className="text-xl md:text-2xl font-bold text-[#1a2332]">{counts.circles}</span>
                </div>
                <div className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 mb-1">???? ?????</span>
                  <span className="text-xl md:text-2xl font-bold text-green-600">{totals.memorized}</span>
                </div>
                <div className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 mb-1">????????</span>
                  <span className="text-xl md:text-2xl font-bold text-blue-600">{totals.revised}</span>
                </div>
                <div className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 mb-1">?????</span>
                  <span className="text-xl md:text-2xl font-bold text-purple-600">{totals.tied}</span>
                </div>
              </div>

              {/* ??????? ???????? ??? ????? ??????? */}
              <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="top-students-memorize" className="bg-white border rounded-lg shadow-sm px-4 data-[state=open]:pb-4">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332]">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-green-600" />
                        ?????? ?????? ????? (??????? - ?? ???? ??????)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {topMemorizers.length > 0 ? topMemorizers.map((s, idx) => (
                        <div key={s.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border-b last:border-0 border-gray-50">
                          <span className="font-medium flex items-center gap-2">
                            <span className="text-gray-400 text-sm">#{idx + 1}</span> {s.name}
                          </span>
                          <span className="font-bold text-green-600">{s.memorized} ???</span>
                        </div>
                      )) : <div className="text-gray-500 text-center py-4">?? ???? ??????</div>}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-students-revise" className="bg-white border rounded-lg shadow-sm px-4 data-[state=open]:pb-4">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332]">
                    <div className="flex items-center gap-2">
                        <Orbit className="w-5 h-5 text-blue-600" />
                        ?????? ?????? ?????? (??????? ???????)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {topRevisers.length > 0 ? topRevisers.map((s, idx) => (
                        <div key={s.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border-b last:border-0 border-gray-50">
                          <span className="font-medium flex items-center gap-2">
                             <span className="text-gray-400 text-sm">#{idx + 1}</span> {s.name}
                          </span>
                          <span className="font-bold text-blue-600">{Math.round(s.revised)} ???</span>
                        </div>
                      )) : <div className="text-gray-500 text-center py-4">?? ???? ??????</div>}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-students-overall" className="bg-white border rounded-lg shadow-sm px-4 data-[state=open]:pb-4">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332]">
                    <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-purple-600" />
                        ?????? ?????? ????? ?????? ???????? ?????????
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {topOverall.length > 0 ? topOverall.map((s, idx) => (
                        <div key={s.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border-b last:border-0 border-gray-50">
                          <span className="font-medium flex items-center gap-2">
                             <span className="text-gray-400 text-sm">#{idx + 1}</span> {s.name}
                          </span>
                          <span className="font-bold text-purple-600">{s.percent.toFixed(1)}%</span>
                        </div>
                      )) : <div className="text-gray-500 text-center py-4">?? ???? ??????</div>}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-circles" className="bg-white border rounded-lg shadow-sm px-4 data-[state=open]:pb-4">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332]">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        ??????? ?????? ???????
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {topCircles.length > 0 ? topCircles.map((c, idx) => (
                        <div key={c.name} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                          <span className="font-bold flex items-center gap-2 text-md">
                             <span className="text-gray-400 text-sm">#{idx + 1}</span> {c.name}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                             <div className="flex flex-col items-center">
                               <span className="text-gray-500">???? ?????</span>
                               <span className="font-bold text-blue-600">{c.attendPercent.toFixed(1)}%</span>
                             </div>
                             <div className="flex flex-col items-center border-r pr-4">
                               <span className="text-gray-500">???? ???????</span>
                               <span className="font-bold text-green-600">{c.evalPercent.toFixed(1)}%</span>
                             </div>
                          </div>
                        </div>
                      )) : <div className="text-gray-500 text-center py-4">?? ???? ??????</div>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
\;

fs.writeFileSync('app/admin/statistics/page.tsx', content, 'utf8');
