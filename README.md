# Circulations (Interop)

Page statique (fetch asynchrone) croisant géoloc IP (affichée séparément), disponibilité VéloStan'lib, météo et qualité de l'air, avec carte Leaflet centrée sur la position de référence (IUT Nancy Charlemagne).

## Fichiers
- `circulations.html` : page principale.
- `styles.css` : styles (responsive/media queries).
- `app.js` : logique fetch + affichage.

## Lancer en local
```bash
cd Interop
python3 -m http.server 8000
```
Ouvrir `http://localhost:8000/circulations.html` (réseau requis pour les API).

## Déploiement webetu
Uploader le dossier `Interop/` tel quel. Le fichier attendu est `Interop/circulations.html` avec `styles.css` et `app.js` à côté. Webetu sert du statique, gardez les chemins relatifs.

## Géoloc IP (affichée, non utilisée pour les calculs)
- IP publique via `https://api64.ipify.org?format=json`.
- Géoloc via `http://ip-api.com/json/{ip}` (fallback `https://ipwho.is/{ip}` si 403/erreur).
- Si IP locale (127.0.0.1/::1), on force une IP de Nancy pour tester.
- Données principales toujours centrées sur l'IUT (48.68291944294635, 6.161064517333171) pour éviter les dérives de géoloc IP.

## APIs
- IP publique : https://api64.ipify.org?format=json
- Géoloc IP : http://ip-api.com/json/{ip} (fallback https://ipwho.is/{ip})
- VéloStan'lib : https://api.citybik.es/v2/networks/velostanlib
- Météo : https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&timezone=auto
- Air : https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=european_aqi,pm10,pm2_5,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide&timezone=auto

## Boutons utiles
- **Relancer la géoloc IP** : retente la détection.
- **Forcer Nancy** : recentre sur Nancy (IUT) si besoin.

## Conformité consignes
- Données vélo/météo/air/géoloc récupérées via `fetch` asynchrone et horodatées.
- Carte Leaflet centrée sur la référence IUT, popups stations (vélos/places) et liste triée par distance.
- Géoloc IP affichée (marqueur séparé) mais non utilisée pour les calculs pour éviter les dérives.
- Liens vers toutes les URLs d'API affichés sur la page (section API utilisées).
- Résilience réseau : fallback IUT si géoloc impossible, fallback ipwho.is si ip-api renvoie 403.
- Mise en forme responsive (media queries).
- Dépôt git public à renseigner dans le pied de page de `circulations.html`.

## Réalisation
Robin Carette, Noé Franoux, Paul Andrieu, Valentino Lambert.
