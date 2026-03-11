export { FilterSidebar } from "./components/FilterSidebar";
export { VideoCard } from "./components/VideoCard";
export { StudentLibraryView } from "./components/StudentLibraryView";
export { StudentLibraryFilters } from "./components/StudentLibraryFilters";
export { useDanceLibrary } from "./hooks/useDanceLibrary";
export {
  filterDanceLibrary,
  getUniqueCategories,
  getDifficultyBounds,
  toInstructionMarker,
  matchesTextSearch,
} from "./utils/filter-moves";
export {
  videoMatchesSearch,
  getMoveTagsFromInstructions,
} from "./utils/search-instructions";
export type { LibraryFilters } from "./utils/filter-moves";
export type { PublishedVideo, UseDanceLibraryFilters, DifficultyLevel } from "./hooks/useDanceLibrary";
export type { StudentLibraryFiltersState } from "./components/StudentLibraryFilters";
