const fs = require('fs');
let c = fs.readFileSync('app/profile/page.tsx', 'utf8');

c = c.replace('rank: number | null\n  created_at: string', 'rank: number | null\n  created_at: string\n  completed_juzs?: number[]\n  current_juzs?: number[]');

const archiveTabContent = `
              <TabsContent value="archive" className="space-y-4 md:space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white p-4 md:p-6">
                    <CardTitle className="text-xl md:text-2xl text-[#1a2332]">السجل الشامل للمحفوظ</CardTitle>
                    <CardDescription className="text-[#1a2332]/60">يحتوي على الأجزاء التي تم إتمامها والتي يتم دراستها حالياً</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 md:pt-3 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                        const isCompleted = studentData?.completed_juzs?.includes(juzNum);
                        const isCurrent = studentData?.current_juzs?.includes(juzNum);
                        
                        let bgColor = "bg-white";
                        let borderColor = "border-[#d8a355]/20";
                        let textColor = "text-[#1a2332]/50";
                        let Icon = BookOpen;
                        let statusText = "غير محفوظ";

                        if (isCompleted) {
                          bgColor = "bg-[#d8a355]/10";
                          borderColor = "border-[#d8a355]";
                          textColor = "text-[#d8a355]";
                          Icon = CheckCircle2;
                          statusText = "مكتمل";
                        } else if (isCurrent) {
                          bgColor = "bg-[#1a2332]/5";
                          borderColor = "border-[#1a2332]/30";
                          textColor = "text-[#1a2332]";
                          Icon = PlayCircle;
                          statusText = "قيد الحفظ";
                        }

                        return (
                          <div key={juzNum} className={\`relative flex flex-col items-center justify-center p-3 rounded-xl border \${borderColor} \${bgColor} transition-all hover:scale-105\`}>
                            <div className="absolute top-2 right-2">
                              {isCompleted && <CheckCircle2 className="w-4 h-4 text-[#d8a355]" />}
                              {isCurrent && <PlayCircle className="w-4 h-4 text-[#1a2332]" />}
                            </div>
                            <div className={\`w-12 h-12 rounded-full flex items-center justify-center mb-2 \${isCompleted ? 'bg-[#d8a355]/20' : (isCurrent ? 'bg-[#1a2332]/10' : 'bg-gray-100')}\`}>
                              <span className={\`text-lg font-bold \${textColor}\`}>{juzNum}</span>
                            </div>
                            <span className={\`text-xs font-bold \${textColor}\`}>الجزء {juzNum}</span>
                            <span className="text-[10px] text-gray-500 mt-1">{statusText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
`;

if (!c.includes('value="archive" className=')) {
  c = c.replace('</Tabs>', archiveTabContent + '\n              </Tabs>');
}

fs.writeFileSync('app/profile/page.tsx', c);
console.log("Archive content injected.");
