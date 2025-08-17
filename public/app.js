// Toggle to true only אחרי שיש פונקציית Netlify אמיתית בשם parse-spec
const USE_NETLIFY = false;

const $ = (sel) => document.querySelector(sel);
const promptEl = $('#prompt');
const specBox = $('#specBox');
const previewBox = $('#previewBox');

$('#toSpec').addEventListener('click', async () => {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) return alert('Write a short app description first 🙂');

  specBox.textContent = 'Working…';

  if (USE_NETLIFY) {
    try {
      const res = await fetch('/.netlify/functions/parse-spec', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error('Function failed');
      const data = await res.json();
      specBox.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      specBox.textContent = 'Error: ' + e.message;
    }
  } else {
    // MOCK: תוצאה מזויפת כדי לראות שהדף עובד
    const fake = {
      app: 'Demo CRM',
      entities: ['Lead','Contact','Task'],
      actions: ['Add lead','Qualify','Convert'],
      input: prompt
    };
    specBox.textContent = JSON.stringify(fake, null, 2);
  }
});

$('#preview').addEventListener('click', () => {
  const prompt = (promptEl.value || '').trim();
  previewBox.textContent = prompt
    ? `Mock preview for: "${prompt}"`
    : 'Type something above and click Preview';
});

$('#download').addEventListener('click', () => {
  const blob = new Blob([specBox.textContent || '{}'], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'spec.json';
  a.click();
});
