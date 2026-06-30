const { execSync } = require('child_process');

try {
  const output = execSync('git log -p config/api.js', { cwd: 'd:\\crispyDosa' }).toString();
  console.log(output.substring(0, 2000));
} catch (e) {
  console.error("Error:", e.message);
}
