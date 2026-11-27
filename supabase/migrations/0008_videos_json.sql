-- Lien → clips (27/11/2026) : l'état des lots (etat.json, compteur-AAAA-MM.json) est rangé dans le
-- stockage « videos », qui n'acceptait que video/mp4. Appliqué directement le 27/11 par l'API de stockage.
update storage.buckets set allowed_mime_types = array['video/mp4', 'application/json'] where id = 'videos';
