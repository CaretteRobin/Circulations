# Circulations (Interop)

Page statique croisant géoloc IP, disponibilité VéloStan'lib, météo et qualité de l'air, avec carte Leaflet.

## Fichiers
- `circulations.html` : page principale.
- `styles.css` : styles.
- `app.js` : logique fetch + affichage.

## Lancer en local
```bash
cd Interop
python3 -m http.server 8000
```
Ouvrir `http://localhost:8000/circulations.html` (nécessite réseau pour les API).

## Déploiement webetu
Uploader le dossier `Interop/` tel quel. Le fichier attendu est `Interop/circulations.html` avec `styles.css` et `app.js` à côté.
Rappel: webetu sert des fichiers statiques; pas besoin de build, gardez les chemins relatifs inchangés.

## Géoloc IP (plus précise)
- IP publique via `https://api64.ipify.org?format=json`.
- Géoloc via `http://ip-api.com/json/{ip}` (fallback `https://ipwho.is/{ip}` si 403/erreur).
- Si IP locale (127.0.0.1/::1), on force une IP de Nancy pour tester.
- Si l'IP géolocalisée n'est pas en 54/Nancy, fallback sur l'IUT (48.6815, 6.1737).

## APIs
- IP publique : https://api64.ipify.org?format=json
- Géoloc IP : http://ip-api.com/json/{ip} (fallback https://ipwho.is/{ip})
- VéloStan'lib : https://api.citybik.es/v2/networks/velostanlib
- Météo : https://api.open-meteo.com/v1/forecast
- Air : https://air-quality-api.open-meteo.com/v1/air-quality

## Boutons utiles
- **Relancer la géoloc IP** : retente la détection.
- **Forcer Nancy** : recentre sur Nancy si l'IP est imprécise.

## Réalisation
Robin Carette, Noé Franoux, Paul Andrieu, Valentino Lambert.
