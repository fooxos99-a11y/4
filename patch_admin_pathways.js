const fs = require('fs');

function patchAdminPathways() {
  const file = 'app/admin/pathways/page.tsx';
  let s = fs.readFileSync(file, 'utf8');

  // 1. Add halaqah + circles state
  if (!s.includes('selectedHalaqah')) {
    s = s.replace(
      'const [selectedLevel, setSelectedLevel] = useState<number>(1)',
      `const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>("all")
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);`
    );
  }

  // 2. Fetch circles and dependency for loadLevels
  if (!s.includes('fetchCircles')) {
    s = s.replace(
      'async function checkAuth() {',
      `async function fetchCircles() {
      const res = await fetch("/api/circles");
      if (res.ok) {
        const data = await res.json();
        const fetches = data.circles || [];
        setCircles(fetches);
        if (fetches.length > 0 && selectedHalaqah === "all") {
          setSelectedHalaqah(fetches[0].name);
        }
      }
    }

    async function checkAuth() {`
    );

    s = s.replace(
      'checkAuth()',
      'checkAuth()\n    fetchCircles()'
    );

    s = s.replace(
      /useEffect\(\(\) => \{\s*if \(isAuthorized[^}]+(?:\s*\}[^}]+)?\}\s*\}, \[isAuthorized\]\)/,
      `useEffect(() => {
    if (isAuthorized && selectedHalaqah !== "all") {
      loadLevels()
    }
  }, [isAuthorized, selectedHalaqah])`
    );
  }

  // 3. loadLevels -> add .eq("halaqah", selectedHalaqah)
  s = s.replace(
    /\.from\("pathway_levels"\)\s*\.select\("\*"\)\s*\.order\("level_number"/g,
    '.from("pathway_levels").select("*").eq("halaqah", selectedHalaqah).order("level_number"'
  );

  // 4. loadQuizzes -> add .eq("halaqah", selectedHalaqah)
  s = s.replace(
    /\.from\("pathway_level_questions"\)\s*\.select\("\*"\)\s*\.eq\("level_number", selectedLevel\)/g,
    '.from("pathway_level_questions").select("*").eq("level_number", selectedLevel).eq("halaqah", selectedHalaqah)'
  );

  // 5. handleAddLevel -> add halaqah: selectedHalaqah
  s = s.replace(
    /level_number: nextNumber,\s*title: `المستوى \$\{nextNumber\}`/g,
    'level_number: nextNumber, halaqah: selectedHalaqah, title: `المستوى ${nextNumber}`'
  );

  // 6. maxLevel delete query: .eq("level_number", maxLevel) => .eq("level_number", maxLevel).eq("halaqah", selectedHalaqah)
  s = s.replace(
    /\.delete\(\)\.eq\("level_number", maxLevel\)/g,
    '.delete().eq("level_number", maxLevel).eq("halaqah", selectedHalaqah)'
  );
  s = s.replace(
    /\.delete\(\)\.eq\('level_number', maxLevel\)/g,
    '.delete().eq(\'level_number\', maxLevel).eq("halaqah", selectedHalaqah)'
  );

  // 7. toggle lock
  s = s.replace(
    /\.eq\('level_number', selectedLevel\)/g,
    '.eq(\'level_number\', selectedLevel).eq("halaqah", selectedHalaqah)'
  );

  // 8. Add quiz query insert
  s = s.replace(
    /level_number: selectedLevel,\s*question: quizQuestion,/g,
    'level_number: selectedLevel, halaqah: selectedHalaqah, question: quizQuestion,'
  );

  // 9. UI: Add dropdown before the buttons in CardHeader
  const dropdownHtml = `
              <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
                <span className="font-bold text-[#1a2332]">اختر الحلقة:</span>
                <Select value={selectedHalaqah} onValueChange={(val) => { setSelectedHalaqah(val); setSelectedLevel(1); }}>
                  <SelectTrigger className="w-[250px] border-[#D4AF37]/40 bg-white">
                    <SelectValue placeholder="اختر الحلقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {circles.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>`;

  if (!s.includes('اختر الحلقة:')) {
    s = s.replace(
      '{/* Page Header */}',
      `{/* Page Header */}${dropdownHtml}`
    );
  }

  // 10. hide elements if no halaqah is selected or it's 'all'
  // Actually, we enforce selecting one by making it default to first.
  

  fs.writeFileSync(file, s);
  console.log('Patched admin/pathways');
}

patchAdminPathways();
