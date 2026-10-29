/*
  ============================================================
   LETRA DE LA CANCIÓN
  ============================================================
   1) Pega la letra entre las dos comillas invertidas ` `
      (una frase por línea, tal cual la tienes).
   2) Guarda y abre index.html: ya se ve con tiempos
      automáticos repartidos en la canción.
   3) Para que quede EXACTA: abre index.html?sync con
      Live Server, presiona ESPACIO al inicio de cada línea
      y pega aquí abajo el TIEMPOS que te genera.
  ============================================================
*/

const TEXTO = `
Tal parece que yo,
me acostumbré a ti en un solo día.
Que te ando extrañando,
como si hace años que te conocía.
Tal parece que yo,
en un solo baile te entregué mi vida.
Tal parece que el sentimiento venció las reglas que había.
`;

// Segundo en que empieza cada línea (lo genera el modo sincronizar).
// Si lo dejas vacío, los tiempos se reparten solos.
// Sacados de la voz real de cancion.mp3 (tiempos por palabra).
const TIEMPOS = [1.75, 3.80, 8.85, 10.50, 15.10, 17.25, 21.80];

// Segundo en que se termina de cantar cada línea (opcional).
// Hace que el relleno rosado vaya al ritmo de la voz y no se quede
// a medias en las pausas instrumentales.
const FINES = [3.30, 6.90, 10.16, 13.72, 16.94, 20.38, 27.06];
