/* Offline text recognition (Tesseract, Apache-2.0). Runs in a Web Worker; nothing is uploaded. */
let api = null, M = null, ready = null;

function load() {
  if (ready) return ready;
  ready = (async () => {
    try {
      importScripts('tesseract-core-simd-lstm.wasm.js');
      M = await TesseractCore();
    } catch (e) {
      // Older browsers without WebAssembly SIMD.
      importScripts('tesseract-core-lstm.wasm.js');
      M = await TesseractCore();
    }
    const r = await fetch('eng.traineddata');
    if (!r.ok) throw new Error('Could not load the text recognition data.');
    M.FS.writeFile('eng.traineddata', new Uint8Array(await r.arrayBuffer()));
    api = new M.TessBaseAPI();
    if (api.Init(null, 'eng') !== 0) throw new Error('Text recognition could not start.');
  })();
  return ready;
}

self.onmessage = async (e) => {
  const { id, png } = e.data;
  try {
    await load();
    M.FS.writeFile('/input', new Uint8Array(png));
    api.SetImageFile();
    api.Recognize(null);
    const tsv = api.GetTSVText(1) || '';
    const words = [];
    for (const line of tsv.split('\n')) {
      const c = line.split('\t');
      if (c[0] !== '5' || c.length < 12) continue;
      const text = c.slice(11).join('\t').trim();
      const conf = parseFloat(c[10]);
      if (!text || conf < 40) continue;
      const x = +c[6], y = +c[7], w = +c[8], h = +c[9];
      if (w <= 0 || h <= 0) continue;
      words.push({ text, x0: x, y0: y, x1: x + w, y1: y + h, conf });
    }
    try { M.FS.unlink('/input'); } catch (_) {}
    self.postMessage({ id, words });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
