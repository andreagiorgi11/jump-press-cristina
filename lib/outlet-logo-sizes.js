// Approved in the logo dashboard by Andrea on 2026-10-05. Dimensions are PDF points.
export const globalLogoPercent = 100;
export const outletLogoSizes = {
  "gazzetta-wordmark": {
    "src": "/testate/pdf/gazzetta-wordmark.png",
    "width": 39.90243902439025,
    "height": 10,
    "percent": 100
  },
  "corriere-sport": {
    "src": "/testate/pdf/corriere-sport.png",
    "width": 52,
    "height": 9.879999999999999,
    "percent": 75
  },
  "tuttosport": {
    "src": "/testate/pdf/tuttosport.png",
    "width": 43.125,
    "height": 10,
    "percent": 65
  },
  "corriere-sera": {
    "src": "/testate/pdf/corriere-sera.png",
    "width": 52,
    "height": 3.791666666666667,
    "percent": 110
  },
  "stampa": {
    "src": "/testate/pdf/stampa.png",
    "width": 52,
    "height": 6.292,
    "percent": 70
  },
  "repubblica": {
    "src": "/testate/pdf/repubblica.png",
    "width": 50,
    "height": 10,
    "percent": 65
  },
  "sole-24-ore": {
    "src": "/testate/pdf/sole-24-ore.png",
    "width": 32.05357142857143,
    "height": 10,
    "percent": 95
  },
  "giornale": {
    "src": "/testate/pdf/giornale.png",
    "width": 52,
    "height": 7.4750000000000005,
    "percent": 70
  },
  "libero": {
    "src": "/testate/libero.png",
    "width": 36.666666666666664,
    "height": 10,
    "percent": 65
  },
  "avvenire": {
    "src": "/testate/avvenire.png",
    "width": 35.916666666666664,
    "height": 10,
    "percent": 75
  },
  "piemonte-liguria": {
    "src": "/testate/piemonte-liguria-readable.png",
    "width": 41.27450980392157,
    "height": 10,
    "percent": 90
  },
  "biellese": {
    "src": "/testate/biellese.png",
    "width": 47.826086956521735,
    "height": 10,
    "percent": 65
  },
  "cronacaqui": {
    "src": "/testate/cronacaqui.png",
    "width": 52,
    "height": 8.125,
    "percent": 75
  },
  "espresso": {
    "src": "/testate/espresso.png",
    "width": 52,
    "height": 9.533333333333333,
    "percent": 70
  },
  "equipe": {
    "src": "/testate/equipe.png",
    "width": 52,
    "height": 9.208333333333334,
    "percent": 65
  },
  "sport": {
    "src": "/testate/pdf/sport.png",
    "width": 37.38317757009346,
    "height": 10,
    "percent": 65
  },
  "sportweek": {
    "src": "/testate/sportweek.png",
    "width": 36.916666666666664,
    "height": 10,
    "percent": 75
  },
  "domani": {
    "src": "/testate/domani.png",
    "width": 47.05882352941176,
    "height": 10,
    "percent": 65
  },
  "standard": {
    "src": "/testate/standard.png",
    "width": 52,
    "height": 7.583333333333334,
    "percent": 85
  },
  "faz": {
    "src": "/testate/faz.png",
    "width": 52,
    "height": 6.825,
    "percent": 95
  },
  "fatto": {
    "src": "/testate/fatto.png",
    "width": 27.2108843537415,
    "height": 10.000000000000002,
    "percent": 100
  },
  "messaggero": {
    "src": "/testate/messaggero.png",
    "width": 52,
    "height": 9.035,
    "percent": 85
  },
  "mattino": {
    "src": "/testate/mattino.png",
    "width": 52,
    "height": 6.565,
    "percent": 85
  },
  "as": {
    "src": "/testate/as.png",
    "width": 18.2648401826484,
    "height": 10,
    "percent": 70
  },
  "bild": {
    "src": "/testate/bild.png",
    "width": 9.400705052878966,
    "height": 10,
    "percent": 95
  },
  "welt": {
    "src": "/testate/welt.png",
    "width": 47.05882352941176,
    "height": 10,
    "percent": 90
  },
  "elpais": {
    "src": "/testate/elpais.png",
    "width": 45.45454545454545,
    "height": 10,
    "percent": 65
  },
  "ft": {
    "src": "/testate/ft.png",
    "width": 52,
    "height": 4.2250000000000005,
    "percent": 95
  },
  "handelsblatt": {
    "src": "/testate/handelsblatt.png",
    "width": 52,
    "height": 7.930000000000001,
    "percent": 80
  },
  "lemonde": {
    "src": "/testate/lemonde.png",
    "width": 43.47826086956522,
    "height": 10,
    "percent": 80
  },
  "lesechos": {
    "src": "/testate/lesechos.png",
    "width": 42.32804232804233,
    "height": 10,
    "percent": 80
  },
  "marca": {
    "src": "/testate/marca.png",
    "width": 29.520295202952028,
    "height": 10,
    "percent": 90
  },
  "mundo": {
    "src": "/testate/mundo.png",
    "width": 30.888030888030887,
    "height": 10,
    "percent": 95
  },
  "guardian": {
    "src": "/testate/guardian.png",
    "width": 30.418250950570343,
    "height": 10,
    "percent": 95
  },
  "nyt": {
    "src": "/testate/nyt.png",
    "width": 52,
    "height": 7.0200000000000005,
    "percent": 90
  },
  "times": {
    "src": "/testate/times.png",
    "width": 52,
    "height": 6.175,
    "percent": 85
  }
};
export function outletLogoSize(key, scale = 1) {
 const entry = outletLogoSizes[key === 'piemonte-liguria-readable' ? 'piemonte-liguria' : key];
 if (!entry) return null;
 const factor = entry.percent / 100 * globalLogoPercent / 100 * scale;
 return {src: entry.src, width: entry.width * factor, height: entry.height * factor};
}
