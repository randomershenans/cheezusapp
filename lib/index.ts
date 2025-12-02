// Re-export all services for easy importing
export * from './supabase';
export * from './storage';

// Legacy cheese service (for backward compatibility during migration)
export {
  type CheeseData,
  type CheeseType as LegacyCheeseType,
  type MilkType as LegacyMilkType,
  saveCheeseEntry,
  getCheeseById as getLegacyCheeseById,
  getCheeses as getLegacyCheeses,
  deleteCheese,
} from './cheese-service';

// New hierarchy services
export * from './cheese-types-service';
export * from './producer-cheese-service';
export * from './flavor-tags-service';
export * from './producer-service';
export * from './feed-service';
