const { execSync } = require('child_process');
try {
  const output = execSync('git show HEAD:services/settingsService.js', { cwd: 'd:\\crispyDosa' }).toString();
  console.log(output);
} catch (e) {
  console.error("Error:", e.message);
}
