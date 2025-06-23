# Cheezus App - Update Documentation

## UI Improvement Updates (June 23, 2025)

### Fixed Font Inconsistencies
- Updated font in Cheezopedia article view (`app/cheezopedia/[id].tsx`)
- Replaced all Poppins font references with Typography constants from the app's design system
- Ensured consistent typography throughout the article pages, including:
  - Headings using Typography.fonts.heading
  - Body text using Typography.fonts.body and Typography.fonts.bodyMedium
  - Proper font scaling with Typography size constants

### Improved Mobile Scaling for Home Feed
- Enhanced responsive design for cheese and article tiles on the home screen (`app/(tabs)/index.tsx`)
- Implemented dynamic card heights based on screen width (75% for cheese cards, 90% for featured article cards)
- Added proper horizontal padding (4% margins) on both sides of the tiles
- Made cards slightly narrower (92% width) for better visual spacing
- Used useWindowDimensions hook for real-time screen size adaptation
- Reduced font sizes for better readability on smaller screens
- Added maxWidth constraints to prevent excessive stretching on large screens
- Ensured consistent spacing between feed items

## Previous Updates
- Added comprehensive documentation in README.md
- Fixed font inconsistency in add-cheese screen search box and related elements

## Tech Stack Reminder
- React Native with Expo SDK 53
- Supabase backend for authentication and database
- Typography system using Inter and SpaceGrotesk fonts
