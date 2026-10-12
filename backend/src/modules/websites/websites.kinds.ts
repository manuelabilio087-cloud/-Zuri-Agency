import { SiteKind } from "@/modules/websites/websites.types";

// Perfil de cada tipo de negócio: texto do botão principal e mensagem já escrita no
// WhatsApp. Os "__" são para o cliente final completar antes de enviar.
export const KIND_PROFILE: Record<SiteKind, { cta: string; message: string }> = {
  restaurante: { cta: "Reservar mesa", message: "Olá! Gostaria de reservar uma mesa para __ pessoas, no dia __, às __." },
  clinica: { cta: "Marcar consulta", message: "Olá! Gostaria de marcar uma consulta. Qual é a próxima disponibilidade?" },
  ginasio: { cta: "Agendar visita", message: "Olá! Gostaria de visitar o ginásio e saber mais sobre os planos." },
  salao: { cta: "Marcar horário", message: "Olá! Gostaria de marcar __ para o dia __, às __." },
  geral: { cta: "Falar connosco", message: "Olá! Vi o vosso site e gostaria de mais informações." },
};

const RESTAURANT = new Set(["restaurant", "cafe", "coffee_shop", "bakery", "bar", "meal_takeaway", "meal_delivery", "pub", "food", "ice_cream_shop", "dessert_shop", "juice_shop", "tea_house", "wine_bar", "night_club", "food_court", "deli", "brunch_restaurant", "breakfast_restaurant"]);
const CLINIC = new Set(["medical_clinic", "doctor", "dentist", "dental_clinic", "hospital", "health", "physiotherapist", "chiropractor", "medical_lab", "veterinary_care", "psychologist", "optician"]);
const GYM = new Set(["gym", "fitness_center", "yoga_studio", "sports_club", "sports_complex", "swimming_pool", "sports_coaching", "pilates_studio"]);
const SALON = new Set(["beauty_salon", "hair_salon", "hair_care", "barber_shop", "nail_salon", "spa", "beautician", "makeup_artist", "massage", "tanning_studio", "skin_care_clinic", "wellness_center"]);

export function kindFromCategory(category: string): SiteKind {
  const key = category.trim().toLowerCase();
  if (RESTAURANT.has(key) || key.endsWith("_restaurant") || key.endsWith("_bar") || key.endsWith("_shop") && key.includes("coffee")) return "restaurante";
  if (CLINIC.has(key) || key.endsWith("_clinic") || key.includes("dent") || key.includes("medical")) return "clinica";
  if (GYM.has(key) || key.includes("fitness") || key.includes("gym")) return "ginasio";
  if (SALON.has(key) || key.includes("salon") || key.includes("barber") || key.includes("beauty")) return "salao";
  return "geral";
}

// "beira" → "Beira", "vila de manica" → "Vila de Manica"
export function titleCaseCity(city: string): string {
  const small = new Set(["de", "da", "do", "das", "dos", "e"]);
  return city
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
