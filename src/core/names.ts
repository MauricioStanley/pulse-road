// Ranking names. The server repeats these exact rules in private.clean_name
// (supabase/ranking.sql); this copy only gives instant feedback.
export const NAME_MIN = 3;
export const NAME_MAX = 16;
const allowed = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ._-]+$/;
const banned = [
  "puta", "puto", "mierda", "verga", "pendej", "culer", "marica", "maricon", "joto",
  "cabron", "chinga", "pinga", "polla", "zorra", "malparid", "hijueputa",
  "gonorrea", "cerote", "mamaguevo", "mamahuevo", "huevon", "idiota", "imbecil", "estupid",
  "fuck", "shit", "bitch", "nigg", "nazi", "hitler", "porn", "sexo", "vagina", "violad",
];
// Accents and look-alike digits fold to plain letters before the word check.
const fold: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
};

export type NameProblem = "short" | "long" | "chars" | "word";
export const nameProblems: Record<NameProblem, string> = {
  short: `Usa al menos ${NAME_MIN} caracteres.`,
  long: `Máximo ${NAME_MAX} caracteres.`,
  chars: "Solo letras, números, espacios, punto, guion y guion bajo.",
  word: "Ese nombre no está permitido. Prueba otro.",
};

/** The name as it will be shown, or why it can't be used. */
export function checkName(raw: string): { name: string } | { problem: NameProblem } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN) return { problem: "short" };
  if (name.length > NAME_MAX) return { problem: "long" };
  if (!allowed.test(name)) return { problem: "chars" };
  let folded = "";
  for (const char of name.toLowerCase()) folded += fold[char] ?? char;
  folded = folded.replace(/[^a-z]/g, "");
  if (banned.some((word) => folded.includes(word))) return { problem: "word" };
  return { name };
}
