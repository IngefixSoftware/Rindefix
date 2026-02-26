import * as XLSX from "xlsx";

export const downloadCSV = (filename, headers, rows) => {
  const escaped = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";
          const value = cell.toString();
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    )
    .join("\n");

  const content = headers && headers.length ? `${headers.join(",")}\n${escaped}` : escaped;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename, ".csv");
};

export const triggerDownload = (blob, filename, defaultExt) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(defaultExt) ? filename : `${filename}${defaultExt}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeHTML = (value) => {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
};

export const downloadExcel = (filename, headers, rows) => {
  const tableHead = headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("");
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHTML(cell)}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><table border="1"><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, filename, ".xls");
};

const TEMPLATE_URL = "/plantilla/FORMATO REND.xlsx";
const TEMPLATE_SHEET_NAME = "Hoja1";
const TEMPLATE_START_CELL = "C21";
const TEMPLATE_REPORT_DATE_CELL = "C13";

export const downloadExcelWithTemplate = async (filename, rows, options = {}) => {
  const { reportDate } = options;

  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error("No se pudo cargar la plantilla de Excel.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet =
    workbook.Sheets[TEMPLATE_SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];

  XLSX.utils.sheet_add_aoa(sheet, rows, { origin: TEMPLATE_START_CELL });

  if (reportDate) {
    const cellAddr = TEMPLATE_REPORT_DATE_CELL;
    const existingCell = sheet[cellAddr] || {};
    sheet[cellAddr] = {
      ...existingCell,
      v: reportDate,
    };
  }

  const wbout = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename, ".xlsx");
};
