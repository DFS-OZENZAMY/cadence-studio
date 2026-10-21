const id = location.pathname.split('/').pop();
const $ = (s) => document.querySelector(s);
const fmt = (s) => { s = Math.round(s || 0); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
fetch(`/api/public/rec/${encodeURIComponent(id)}`).then(async (r) => {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Vidéo introuvable');
  document.title = `${d.title} · ${d.studio}`;
  $('#title').textContent = d.title;
  $('#studio').textContent = d.studio;
  $('#sub').textContent = `${fmt(d.duration)}, le ${new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const f = document.createElement('iframe');
  f.src = `https://drive.google.com/file/d/${encodeURIComponent(d.driveId)}/preview`;
  f.allow = 'autoplay; fullscreen'; f.allowFullscreen = true; f.title = d.title;
  $('#player').replaceChildren(f);
}).catch((e) => {
  $('#player').innerHTML = '<div class="loading">Cette vidéo n’est plus partagée, ou le lien est incorrect.</div>';
  $('#title').textContent = 'Vidéo indisponible'; $('#sub').textContent = e.message;
});
