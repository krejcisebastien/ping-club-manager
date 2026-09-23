import { ref } from "vue";
import { FilterMatchMode } from "primevue/api";

// Recherche globale pour une DataTable : un seul champ texte, réparti sur
// plusieurs colonnes via :global-filter-fields sur la DataTable.
export function useTableFilter() {
  const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
  return { filters };
}
