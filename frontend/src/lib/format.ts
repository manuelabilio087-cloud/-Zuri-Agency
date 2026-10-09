// Categorias vêm da Google Places em formato de código (ex: "medical_clinic").
// Mostra-as legíveis: "Medical clinic".
export function formatCategory(category: string | null | undefined): string {
  if (!category) return "";
  const text = category.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
