export const BRANCHES = [
  "Rancagua",
  "Concepción",
  "Coquimbo",
  "Viña del Mar",
  "Temuco",
  "Casa Matriz",
];

export const RENDITION_TYPES = [
  { value: "CAJA_CHICA", label: "Caja chica" },
  { value: "COMBUSTIBLE", label: "Combustible" },
  { value: "FONDO_POR_RENDIR", label: "Fondo por rendir" },
];

export const RENDITION_TYPE_LABELS = RENDITION_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});
