export const encouragements = ["¡Lo haces increíble!", "¡Ese ritmo es tuyo!", "¡Mira hasta dónde has llegado!", "¡Tu combo está encendido!", "¡Qué buena racha!", "¡Sigue así, vas volando!", "¡Una plataforma a la vez!", "¡Estás en tu mejor ritmo!"] as const;
export const lossMessages = ["¿Nos vamos a rendir tan cerca?", "Ese salto no define tu partida.", "Respira. El siguiente intento es tuyo.", "Ya conoces un poco más el camino.", "Los grandes combos empiezan de nuevo.", "La pista sigue aquí. Tú decides cuándo.", "Un tropiezo, no el final.", "Casi lo tenías. Encuentra de nuevo el pulso."] as const;
export function nextMessage(messages: readonly string[], previous = "", random = Math.random): string {
  const choices = messages.filter(message => message !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] ?? messages[0] ?? "";
}
