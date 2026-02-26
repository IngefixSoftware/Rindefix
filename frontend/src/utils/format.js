const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export const formatCLP = (value) => currencyFormatter.format(Number(value) || 0);

export const parseCLP = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = value.toString().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatDate = (value, locale = "es-CL") => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString(locale);
  }
  const match = typeof value === "string" ? value.match(DATE_REGEX) : null;
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString(locale);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale);
};
