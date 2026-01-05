# Circulations (Interop)

Page HTML statique permettant de croiser :
- géolocalisation IP (fallback Nancy)
- disponibilité des vélos VeloStan'lib (CityBikes)
- météo et qualité de l'air (Open-Meteo)
- affichage Leaflet avec stations proches triées par distance.

## Structure
- `circulations.html` : page principale.
- `styles.css` : styles.
- `app.js` : logique fetch + affichages.

## Lancer en local
```bash
cd Interop
python3 -m http.server 8000
```
Puis ouvrir `http://localhost:8000/circulations.html` (nécessite le réseau pour les API).

## Déploiement webetu
Uploader le dossier `Interop/` tel quel. Le fichier attendu est `Interop/circulations.html` (avec `styles.css` et `app.js` à côté).

## Boutons utiles
- **Relancer la géoloc IP** : retente l'IP (peut être éloignée selon l'opérateur).
- **Forcer Nancy** : recentre la carte et les calculs sur Nancy si l'IP est imprécise.

## APIs utilisées
- IP : https://ipapi.co/json/
- VéloStan'lib : https://api.citybik.es/v2/networks/velostanlib
- Météo : https://api.open-meteo.com/v1/forecast
- Air : https://air-quality-api.open-meteo.com/v1/air-quality

## Note
Les liens de dépôt git doivent être ajustés dans le pied de page si besoin.***
