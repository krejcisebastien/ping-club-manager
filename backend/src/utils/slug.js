import { prisma } from "../lib/prisma.js";

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Slug libre à partir d'un nom : "mon-club", puis "mon-club-2", "mon-club-3"...
export async function uniqueSlug(name) {
  const base = slugify(name) || "club";
  let slug = base;
  for (let n = 2; await prisma.club.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
  return slug;
}
