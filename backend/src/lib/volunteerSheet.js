import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { formatIban } from "./iban.js";

const TEMPLATE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/volunteer-template.xlsx");

// Mise en page du modèle « Note de défraiement - Bénévolat » : lignes de prestations
// 18 à 27 (colonnes B date, C heures, D nature, E total), total en ligne 28.
const FIRST_LINE = 18;
const LINES_PER_SHEET = 10;
const LAST_LINE = FIRST_LINE + LINES_PER_SHEET - 1;
const TOTAL_ROW = LAST_LINE + 1;

// Copie d'une feuille du modèle (valeurs, styles, fusions, logo) pour les notes de plus de 10 lignes.
function cloneSheet(workbook, source, name) {
  const copy = workbook.addWorksheet(name);
  copy.pageSetup = { ...source.pageSetup };
  copy.views = source.views.map((v) => ({ ...v }));
  for (let col = 1; col <= 6; col += 1) copy.getColumn(col).width = source.getColumn(col).width;

  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const target = copy.getRow(rowNumber);
    target.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = target.getCell(colNumber);
      targetCell.value = cell.value;
      targetCell.style = JSON.parse(JSON.stringify(cell.style));
    });
  });
  for (const range of source.model.merges ?? []) copy.mergeCells(range);
  for (const image of source.getImages()) copy.addImage(image.imageId, image.range);
  return copy;
}

// À la séance, le nombre de séances explique le montant (le modèle n'a pas de colonne dédiée).
const natureLabel = (line, rate) => (rate?.basis === "SESSION" ? `${line.nature} (${line.sessions} séance${line.sessions > 1 ? "s" : ""})` : line.nature);

const excelDate = (day) => new Date(`${day}T00:00:00.000Z`);

function fillSheet(sheet, sheetData, page) {
  const { person } = sheetData;
  sheet.getCell("B13").value = `Demandeur: ${person.lastName} ${person.firstName}`;
  sheet.getCell("B14").value = `Adresse : ${person.address ?? ""}`;
  sheet.getCell("B15").value = `Numéro de compte: ${person.iban ? formatIban(person.iban) : "BE"}`;

  for (let i = 0; i < LINES_PER_SHEET; i += 1) {
    const row = FIRST_LINE + i;
    const line = page[i];
    sheet.getCell(`B${row}`).value = line ? excelDate(line.date) : null;
    sheet.getCell(`C${row}`).value = line ? line.hours : null;
    sheet.getCell(`D${row}`).value = line ? natureLabel(line, sheetData.rate) : null;
    sheet.getCell(`E${row}`).value = line && line.amount != null ? line.amount : null;
  }

  const pageHours = page.reduce((sum, l) => sum + l.hours, 0);
  const pageTotal = page.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  sheet.getCell(`C${TOTAL_ROW}`).value = Math.round(pageHours * 100) / 100;
  // Le modèle additionne E18:E25 seulement : on couvre les 10 lignes.
  sheet.getCell(`E${TOTAL_ROW}`).value = { formula: `SUM(E${FIRST_LINE}:E${LAST_LINE})`, result: Math.round(pageTotal * 100) / 100 };
}

// Renvoie le classeur Excel (Buffer) : une feuille par tranche de 10 jours prestés.
export async function buildVolunteerWorkbook(sheetData) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  const template = workbook.worksheets[0];
  for (const extra of workbook.worksheets.slice(1)) workbook.removeWorksheet(extra.id);

  const pages = [];
  for (let i = 0; i < sheetData.lines.length; i += LINES_PER_SHEET) pages.push(sheetData.lines.slice(i, i + LINES_PER_SHEET));
  if (!pages.length) pages.push([]);

  // On crée les copies avant de remplir la première feuille, pour qu'elles partent du modèle vierge.
  const sheets = [template, ...pages.slice(1).map((_, i) => cloneSheet(workbook, template, `Note ${i + 2}`))];
  template.name = "Note 1";
  sheets.forEach((sheet, i) => fillSheet(sheet, sheetData, pages[i]));

  return workbook.xlsx.writeBuffer();
}
