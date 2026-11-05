// usage: node drive.js stills f1,f2,...   |   node drive.js scene <kind> <from> <to> <out.mp4>
const fs = require('fs'), { spawn } = require('child_process'), { chromium } = require('playwright');
const mode = process.argv[2];
(async () => {
  const html = fs.readFileSync(__dirname + '/render.html', 'utf8').replace('<script>', '<script>window.D=' + fs.readFileSync(__dirname + '/' + (process.env.REC || 's4.rec.json'), 'utf8') + ';</script><script>');
  fs.writeFileSync(__dirname + '/page_' + process.pid + '.html', html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/page_' + process.pid + '.html'); await p.waitForTimeout(300);
  if (errs.length) { console.log(errs); process.exit(1); }
  if (mode === 'stills') {
    console.log(await p.evaluate(() => info()));
    for (const f of process.argv[3].split(',')) { const [kind, i, n] = f.includes(':') ? f.split(':') : ['map', f, 0]; const b64 = await p.evaluate(([k, i, n]) => frameJPEG(k, +i, +n), [kind, i, n]); fs.writeFileSync(`${__dirname}/still_${kind}_${i}.jpg`, Buffer.from(b64, 'base64')); }
  } else {
    const [kind, from, to, out] = process.argv.slice(3), tmp = out.replace('.mp4', '.part.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = +to - +from;
    for (let i = +from; i < +to; i++) {
      const b64 = await p.evaluate(([k, i, n]) => frameJPEG(k, i, n), [kind, kind === 'map' ? i : i - +from, n]);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code === 0) fs.renameSync(tmp, out); else console.log('ffmpeg failed', code);
  }
  fs.unlinkSync(__dirname + '/page_' + process.pid + '.html');
  await b.close();
})();
