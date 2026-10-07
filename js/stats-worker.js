/* Count large documents off the UI thread; the editor ignores stale jobs. */
self.onmessage = ({ data: { body, job, noteId } }) => {
  let charsNoSpace = 0, words = 0, lines = body ? 1 : 0, inWord = false;
  for (let i = 0; i < body.length; i += 1) {
    const code = body.charCodeAt(i);
    if (code === 10) lines += 1;
    const space = code < 128 ? code === 32 || (code >= 9 && code <= 13) : /\s/.test(body[i]);
    if (!space) { charsNoSpace += 1; if (!inWord) words += 1; }
    inWord = !space;
  }
  const reading = words === 0 ? '0 phút đọc' : `${Math.max(1, Math.round(words / 220))} phút đọc`;
  self.postMessage({ job, noteId, chars: body.length, stats: { chars: body.length, charsNoSpace, words, lines, reading } });
};
