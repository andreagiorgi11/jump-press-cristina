# Archivio PDF Jump Press su Hetzner

Servizio `jump-press-files`, porta interna 3320 (solo 127.0.0.1), dominio `jpfiles.agprojects.dev`.
Dati in `/opt/jump-press-files/data` (esclusi dal web: si leggono solo con la chiave o con link firmati a scadenza).

1. `apt-get install -y qpdf` (taglio pagine a bassa memoria; senza qpdf il servizio usa pdf-lib).
2. Utente di sistema `jumppress`, cartelle `/opt/jump-press-files/{app,data}`, `.env` con `FILES_SECRET=` (≥32 caratteri, `chmod 600`) e `PORT=3320`.
3. Copiare `server.mjs` e `package.json` in `app/`, `npm install --omit=dev`.
4. `jump-press-files.service` in `/etc/systemd/system/`, `systemctl enable --now jump-press-files`.
5. Nginx: `nginx-jpfiles.agprojects.dev.conf` in `sites-available` + link in `sites-enabled`, `nginx -t && systemctl reload nginx`, poi `certbot --nginx -d jpfiles.agprojects.dev`.
6. Sul sito (Vercel): `JUMP_FILES_URL=https://jpfiles.agprojects.dev` e `JUMP_FILES_SECRET` uguale a `FILES_SECRET`.

Verifica: `curl https://jpfiles.agprojects.dev/health` → `{"ok":true,"qpdf":true}`; senza chiave `/o/...` risponde 401.
