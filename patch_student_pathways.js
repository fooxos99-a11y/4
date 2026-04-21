const fs = require('fs');

function patchStudentPathways() {
  const file = 'app/pathways/page.tsx';
  let s = fs.readFileSync(file, 'utf8');

  // Change fetchLevels signature to accept halaqah
  if (!s.includes('async function fetchLevels(supabase: any, halaqah?: string)')) {
    s = s.replace(
      'async function fetchLevels(supabase: any) {',
      'async function fetchLevels(supabase: any, halaqah?: string) {'
    );

    const oldFetchLevelsBody = `.from('pathway_levels')



    .select('*')



    .order('level_number', { ascending: true });`;

    const newFetchLevelsBody = `let query = supabase.from('pathway_levels').select('*');
    if (halaqah) { query = query.eq('halaqah', halaqah); }
    const { data, error } = await query.order('level_number', { ascending: true });`;

    s = s.replace(oldFetchLevelsBody, newFetchLevelsBody);
  }

  // Inside useEffect where fetchLevels is called, we need to defer it until we have student halaqah
  const oldUseEffectPattern = `fetchLevels(supabase).then((levelsFromDb) => {



      if (loggedIn && role === "student") {



        loadPathwayData(levelsFromDb)



      } else {`;
      
  const newUseEffectPattern = `let studentHalaqah = null;
    const currentUserStr = localStorage.getItem("currentUser");
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        studentHalaqah = currentUser.halaqah;
      } catch (e) {}
    }

    fetchLevels(supabase, studentHalaqah || undefined).then((levelsFromDb) => {



      if (loggedIn && role === "student") {



        loadPathwayData(levelsFromDb)



      } else {`;

  if(!s.includes('let studentHalaqah = null;')) {
     // I'll be gentler. Replace just `fetchLevels(supabase).then(` with the block.
     s = s.replace('fetchLevels(supabase).then((levelsFromDb) => {', newUseEffectPattern);
  }

  fs.writeFileSync(file, s);
  console.log('Patched student pathways');
}

patchStudentPathways();