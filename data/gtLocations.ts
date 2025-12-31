// data/gtLocations.ts

export type Option = { id: string; name: string };

export const DEPARTMENTS: Option[] = [
  { id: "alta_verapaz", name: "Alta Verapaz" },
  { id: "baja_verapaz", name: "Baja Verapaz" },
  { id: "chimaltenango", name: "Chimaltenango" },
  { id: "chiquimula", name: "Chiquimula" },
  { id: "el_progreso", name: "El Progreso" },
  { id: "escuintla", name: "Escuintla" },
  { id: "guatemala", name: "Guatemala" },
  { id: "huehuetenango", name: "Huehuetenango" },
  { id: "izabal", name: "Izabal" },
  { id: "jalapa", name: "Jalapa" },
  { id: "jutiapa", name: "Jutiapa" },
  { id: "peten", name: "Petén" },
  { id: "quetzaltenango", name: "Quetzaltenango" },
  { id: "quiche", name: "Quiché" },
  { id: "retalhuleu", name: "Retalhuleu" },
  { id: "sacatepequez", name: "Sacatepéquez" },
  { id: "san_marcos", name: "San Marcos" },
  { id: "santa_rosa", name: "Santa Rosa" },
  { id: "solola", name: "Sololá" },
  { id: "suchitepequez", name: "Suchitepéquez" },
  { id: "totonicapan", name: "Totonicapán" },
  { id: "zacapa", name: "Zacapa" },
];

// ✅ Piloto completo para Sacatepéquez (incluye San Lucas)
// Agregá más departamentos aquí poco a poco.
export const MUNICIPALITIES_BY_DEPT: Record<string, Option[]> = {
  sacatepequez: [
    { id: "antigua_guatemala", name: "Antigua Guatemala" },
    { id: "ciudad_vieja", name: "Ciudad Vieja" },
    { id: "jocotenango", name: "Jocotenango" },
    { id: "magdalena_milotz", name: "Magdalena Milpas Altas" },
    { id: "pastores", name: "Pastores" },
    { id: "san_antonio_aguas_calientes", name: "San Antonio Aguas Calientes" },
    { id: "san_bartolome_milotz", name: "San Bartolomé Milpas Altas" },
    { id: "san_lucas_sacatepequez", name: "San Lucas Sacatepéquez" },
    { id: "san_miguel_duenas", name: "San Miguel Dueñas" },
    { id: "santa_catarina_barahona", name: "Santa Catarina Barahona" },
    { id: "santa_lucia_milotz", name: "Santa Lucía Milpas Altas" },
    { id: "santa_maria_jesus", name: "Santa María de Jesús" },
    { id: "santiago_sacatepequez", name: "Santiago Sacatepéquez" },
    { id: "santo_domingo_xenacoj", name: "Santo Domingo Xenacoj" },
    { id: "sumpango", name: "Sumpango" },
  ],
};

export function getMunicipalities(deptId: string): Option[] {
  return MUNICIPALITIES_BY_DEPT[deptId] ?? [];
}
