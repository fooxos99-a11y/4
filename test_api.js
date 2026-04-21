fetch('http://localhost:3000/api/student-attendance/all?date=2024-03-01')
  .then(res => res.text())
  .then(text => console.log('Response content:', text.substring(0, 1000)))
  .catch(err => console.error(err));
