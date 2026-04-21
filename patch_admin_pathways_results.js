const fs = require('fs');

function patchAdminPathwaysResults() {
  const file = 'app/admin/pathways-results/page.tsx';
  let s = fs.readFileSync(file, 'utf8');

  // Add halaqah + circles state
  if (!s.includes('selectedHalaqah')) {
    s = s.replace(
      'const [selectedLevel, setSelectedLevel] = useState<number | "all">("all")',
      `const [selectedLevel, setSelectedLevel] = useState<number | "all">("all")
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>("all")
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);`
    );

    s = s.replace(
      'async function checkAuth() {',
      `async function fetchCircles() {
      const res = await fetch("/api/circles");
      if (res.ok) {
        const data = await res.json();
        const fetches = data.circles || [];
        setCircles(fetches);
        if (fetches.length > 0) {
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

    // change useEffect dep and filter condition for fetchData
    s = s.replace(
      '}, [isAuthorized, activeTab])',
      '}, [isAuthorized, activeTab, selectedHalaqah])'
    );
  }

  // Modify API call or DB fetch in fetchData to filter students by halaqah
  // In `app/admin/pathways-results/page.tsx` the function `fetchData` probably fetches `students` and `pathway_levels`.
  // Let's modify the `students` query.
  if(!s.includes('.eq("halaqah", selectedHalaqah)')) {
    s = s.replace(
      /\.from\("students"\)\.select\("id, name"\)/g,
      '.from("students").select("id, name").eq("halaqah", selectedHalaqah)'
    );

    s = s.replace(
      /\.from\("pathway_levels"\)\.select\("id, level_number, title"\)/g,
      '.from("pathway_levels").select("id, level_number, title").eq("halaqah", selectedHalaqah)'
    );
  }

  // UI modification
  const dropdownHtml = `
              <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
                <span className="font-bold text-[#1a2332]">اختر الحلقة:</span>
                <Select value={selectedHalaqah} onValueChange={(val) => { setSelectedHalaqah(val); setSelectedLevel("all"); }}>
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
      '<CardContent className="p-6">',
      `<CardContent className="p-6">\n${dropdownHtml}`
    );
  }

  fs.writeFileSync(file, s);
  console.log('Patched admin/pathways-results');
}

patchAdminPathwaysResults();
