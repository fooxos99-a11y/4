const fs = require('fs');

const content = "use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { SiteLoader } from "@/components/ui/site-loader";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Trophy, BookOpen, Orbit, Percent } from "lucide-react";
import { calculateTotalEvaluationPoints, applyAttendancePointsAdjustment } from "@/lib/student-attendance";
import ReactECharts from "echarts-for-react";

export default function StatisticsPage() {
  const [dateFilter, setDateFilter] = useState("month");
  const [loading, setLoading] = useState(true);
  
  const [counts, setCounts] = useState({ circles: 0, students: 0 });
  const [totals, setTotals] = useState({ memorized: 0, revised: 0, tied: 0 });
  
  const [topMemorizers, setTopMemorizers] = useState([]);
  const [topRevisers, setTopRevisers] = useState([]);
  const [topCircles, setTopCircles] = useState([]);
  const [topOverall, setTopOverall] = useState([]);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    
    // إعداد التواريخ
    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'today') {
      startDate = new Date();
    } else if (dateFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateFilter === 'semester') {
      startDate.setMonth(now.getMonth() - 6);
    } else {
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
      const usersMap = new Map((users || []).map((u) => [u.id, u.name]));
      
      const { data: plans } = await supabase.from('student_plans').select('student_id, daily_pages, muraajaa_pages, rabt_pages');
      const plansMap = new Map();
      (plans || []).forEach((p) => {
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
      
      (attendance || []).forEach((record) => {
         const sId = record.student_id;
         if (!studentStats.has(sId)) {
             studentStats.set(sId, { id: sId, name: usersMap.get(sId) || 'غير معروف', memorized: 0, revised: 0, tied: 0, maxPoints: 0, earnedPoints: 0 });
         }
         
         const cName = record.halaqah || 'غير محدد';
         if (!circleStats.has(cName) && cName !== 'غير محدد') {
             circleStats.set(cName, { name: cName, maxPoints: 0, earnedPoints: 0, totalAttend: 0, totalRecords: 0, memorized: 0 });
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
             sStat.maxPoints += 40; 
             if (cStat) cStat.maxPoints += 40;
         }
      });
      
      setTotals({ memorized: aggMemo, revised: aggRev, tied: aggTied });
      
      const sArray = Array.from(studentStats.values());
      const cArray = Array.from(circleStats.values());
      
      sArray.forEach((s) => {
          s.percent = s.maxPoints > 0 ? (s.earnedPoints / s.maxPoints) * 100 : 0;
      });
      cArray.forEach((c) => {
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

  // ECharts Configurations
  const getMemorizersOption = () => {
    const data = [...topMemorizers].reverse(); 
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '15%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { 
        type: 'category', 
        data: data.map(s => s.name),
        axisLabel: { fontFamily: 'Cairo', fontWeight: 'bold' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
          name: 'أوجه الحفظ',
          type: 'bar',
          data: data.map(s => s.memorized),
          itemStyle: { color: '#16a34a', borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', formatter: '{c} وجه', fontFamily: 'Cairo', color: '#16a34a', fontWeight: 'bold' },
          barWidth: '40%'
      }]
    };
  };

  const getRevisersOption = () => {
    const data = [...topRevisers].reverse(); 
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '15%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { 
        type: 'category', 
        data: data.map(s => s.name),
        axisLabel: { fontFamily: 'Cairo', fontWeight: 'bold' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
          name: 'أوجه المراجعة',
          type: 'bar',
          data: data.map(s => Math.round(s.revised)),
          itemStyle: { color: '#2563eb', borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', formatter: '{c} وجه', fontFamily: 'Cairo', color: '#2563eb', fontWeight: 'bold' },
          barWidth: '40%'
      }]
    };
  };

  const getOverallOption = () => {
    const data = [...topOverall].reverse(); 
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>{a}: {c}%' },
      grid: { left: '3%', right: '15%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { 
        type: 'category', 
        data: data.map(s => s.name),
        axisLabel: { fontFamily: 'Cairo', fontWeight: 'bold' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
          name: 'النسبة الإجمالية',
          type: 'bar',
          data: data.map(s => Number(s.percent.toFixed(1))),
          itemStyle: { color: '#9333ea', borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'Cairo', color: '#9333ea', fontWeight: 'bold' },
          barWidth: '40%'
      }]
    };
  };

  const getCirclesOption = () => {
    const data = [...topCircles].reverse();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['جودة التقييم', 'الحضور الحقيقي'], bottom: 0, textStyle: { fontFamily: 'Cairo', fontWeight: 'bold' } },
      grid: { left: '3%', right: '15%', bottom: '15%', containLabel: true },
      xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { 
        type: 'category', 
        data: data.map(c => c.name),
        axisLabel: { fontFamily: 'Cairo', fontWeight: 'bold' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'جودة التقييم',
          type: 'bar',
          data: data.map(c => Number(c.evalPercent.toFixed(1))),
          itemStyle: { color: '#16a34a', borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'Cairo', fontSize: 10 },
          barGap: '10%'
        },
        {
          name: 'الحضور الحقيقي',
          type: 'bar',
          data: data.map(c => Number(c.attendPercent.toFixed(1))),
          itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'Cairo', fontSize: 10 }
        }
      ]
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          
          <div className="border-b border-[#D4AF37]/50 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-[#1a2332]">الإحصائيات والرسوم البيانية</h1>
            <select
              className="border border-[#D4AF37] rounded-md p-2 bg-white text-sm outline-none font-bold text-gray-700 w-full md:w-48"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">اليوم</option>
              <option value="week">الأسبوع الحالي</option>
              <option value="month">الشهر الحالي</option>
              <option value="semester">الفصل الحالي</option>
              <option value="all">الكل</option>
            </select>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center"><SiteLoader size="lg" /></div>
          ) : (
            <>
              {/* احصاءات سريعة - مربعات صغيرة وخطوط بارزة كطلب المستخدم */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400 mb-1 font-bold">إجمالي الطلاب</span>
                  <span className="text-3xl font-bold text-[#1a2332]">{counts.students}</span>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400 mb-1 font-bold">الحلقات</span>
                  <span className="text-3xl font-bold text-[#1a2332]">{counts.circles}</span>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400 mb-1 font-bold">مجموع أوجه الحفظ</span>
                  <span className="text-3xl font-bold text-green-600">{totals.memorized}</span>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400 mb-1 font-bold">أوجه المراجعة</span>
                  <span className="text-3xl font-bold text-blue-600">{totals.revised}</span>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400 mb-1 font-bold">أوجه الربط</span>
                  <span className="text-3xl font-bold text-purple-600">{totals.tied}</span>
                </div>
              </div>

              {/* الرسوم البيانية التفاعلية باستخدام Apache ECharts (الأصل مسكرة للمحافظة على الطلب السابق) */}
              <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="top-students-memorize" className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332] py-5">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-green-600" />
                        الطلاب الأعلى حفظاً (رسم بياني)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6">
                    {topMemorizers.length > 0 ? (
                      <ReactECharts option={getMemorizersOption()} style={{ height: '400px', width: '100%' }} />
                    ) : (
                      <div className="text-gray-500 text-center py-10">لا توجد بيانات للفترة المحددة</div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-students-revise" className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332] py-5">
                    <div className="flex items-center gap-2">
                        <Orbit className="w-5 h-5 text-blue-600" />
                        الطلاب الأعلى مراجعة (رسم بياني)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6">
                    {topRevisers.length > 0 ? (
                      <ReactECharts option={getRevisersOption()} style={{ height: '400px', width: '100%' }} />
                    ) : (
                      <div className="text-gray-500 text-center py-10">لا توجد بيانات للفترة المحددة</div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-students-overall" className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332] py-5">
                    <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-purple-600" />
                        الطلاب الأعلى بالنسبة الإجمالية (حضور + وتقييم)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6">
                    {topOverall.length > 0 ? (
                      <ReactECharts option={getOverallOption()} style={{ height: '400px', width: '100%' }} />
                    ) : (
                      <div className="text-gray-500 text-center py-10">لا توجد بيانات للفترة المحددة</div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="top-circles" className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold text-lg text-[#1a2332] py-5">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        تقييم الحلقات الأعلى إنجازاً
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6">
                    {topCircles.length > 0 ? (
                      <ReactECharts option={getCirclesOption()} style={{ height: '400px', width: '100%' }} />
                    ) : (
                      <div className="text-gray-500 text-center py-10">لا توجد بيانات للفترة المحددة</div>
                    )}
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
