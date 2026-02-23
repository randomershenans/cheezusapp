# Cheezus App - Update Documentation

## Shop Page Improvements & Event Details Page (February 23, 2026)

### Shop Page Fixes
- **Removed duplicate badges**: Removed green "✓ Verified" badge from hero (already shown as "Verified Partner" in stats bar), removed yellow shop type badge from hero (already in stats bar)
- **Fixed cheeses not loading**: Changed query from non-existent `shop_cheeses` table to correct `shop_stock` table
- **Added "Show on Map" button**: Yellow button in Contact & Location section navigates to discover page map view centered on shop location
- **Redesigned Contact & Location**: Changed from stacked full-width rows to a compact 2x2 grid with icon next to label, reducing vertical space

### Event Details Page (`app/event/[id].tsx`)
- New page for viewing event details, accessible at `/event/[id]`
- Hero section with event image, type badge (Tasting, Market, Festival, etc.), and status badge (Upcoming, Happening Now, Past Event, Cancelled)
- Quick info bar with date and time
- Price & tickets section with "Get Tickets" / "Register" button
- Expandable description
- Location section with "Show on Map" and open in maps
- Online access link for virtual events
- Capacity display and organizer info from `partners` table

### Discover Page Improvements
- **Filter bar applies to map view**: Map markers now filter based on active filter (All, Cheeses, Producers) using `useMemo`
- **US locale detection**: Auto-detects US locale via `Intl.DateTimeFormat` and shows distances in miles/feet instead of km/m
- **Renamed section**: "Cheeses Near You" → "Cheese Near You"

### Taste Match Feature (`app/producer-cheese/[id].tsx`)
- **"Matches your taste" section**: Shows logged-in users why a cheese matches their taste profile
- Compares cheese attributes against user's taste profile from `get_user_taste_profile` RPC
- Matches on: cheese family, origin country, milk type, producer (by UUID), flavor tags, cheese type
- Filters out "generic" and "unknown" values from match reasons
- Clean styling: subtle background card with yellow left accent bar, uppercase label
- Updated `UserTasteProfile` interface in `feed-service.ts` to include `favorite_types` and `favorite_flavors`

### Clickable Cheese Details
- Detail grid items (Type, Family, Milk Type, Texture, Rind) are now tappable `TouchableOpacity` components
- Tapping navigates to home feed search with that term pre-filled
- Clickable cards have a yellow bottom border to indicate interactivity
- Non-searchable items (Color, Ageing, Fat Content, Calcium, Vegetarian, Vegan) remain static

### Producer Page
- **Copy address button**: Small copy icon next to address in "Find Us" section, copies address to clipboard

---

## Content-Cheese Bi-directional Linking (January 16, 2026)

### Added Bi-directional Content-Cheese Linking Feature
Enables users to discover cheeses from content and discover content from cheeses.

### Database Schema
- Created `db/content-cheese-links-schema.sql`:
  - `content_cheese_links` junction table linking `cheezopedia_entries` to cheeses
  - Supports links to both `cheese_types` (broad, e.g., "Brie") and `producer_cheeses` (specific, e.g., "President Brie")
  - RLS policies for viewing and creating links
  - Indexes for fast lookups from both directions

### RPC Functions Created
- **`get_content_cheeses(p_content_id, p_limit)`** - Get cheeses linked to content (for article/recipe pages)
- **`get_cheese_content(p_cheese_type_id, p_producer_cheese_id, p_limit)`** - Get content linked to cheese (for cheese detail pages)
- **`count_cheese_content(p_cheese_type_id, p_producer_cheese_id)`** - Count total content for "see more"

### Components Created
- **`components/CheeseTileGrid.tsx`**:
  - Displays linked cheese tiles in a 2-column grid
  - Shows cheese name, category, origin, and rating
  - Navigates to producer-cheese or cheese-type detail pages
  - Configurable title and max display count (default 6)

- **`components/ContentTileGrid.tsx`**:
  - Displays linked content tiles in a 2-column grid
  - Shows content type badge, title, and reading time
  - Supports articles, recipes, guides, and pairings
  - "See more" button when total count exceeds display limit
  - Configurable title and max display count (default 4)

### Pages Updated
- **`app/cheezopedia/[id].tsx`**:
  - Added `linkedCheeses` state
  - Added `fetchLinkedCheeses()` function calling `get_content_cheeses` RPC
  - Added "Featured Cheeses" section at bottom using `CheeseTileGrid`

- **`app/producer-cheese/[id].tsx`**:
  - Added `relatedContent` and `contentCount` state
  - Added `fetchRelatedContent()` function calling `get_cheese_content` RPC
  - Added "What to do with this cheese" section using `ContentTileGrid`

### User Experience
1. **On articles/recipes**: Users see up to 6 cheese tiles at the bottom, can click to learn more about each cheese
2. **On cheese detail pages**: Users see up to 4 content tiles (recipes, articles, pairings) with "See more" option
3. Answers the common question: "I have this cheese, what do I do with it?"

### Admin Integration
- Cheese links will be added via the web portal when creating/editing articles
- User is handling the admin portal side

### Deployment Steps
1. Run `db/content-cheese-links-schema.sql` in Supabase SQL Editor
2. Add cheese links to content via admin portal
3. Content will automatically appear on cheese pages and vice versa

---
## Immersive Producer Showcase Pages (February 22, 2026)

### Transformed producer pages into cinematic, CMS-driven showcase experiences
- **Goal**: Make producer pages worthy of being the official app of the World Cheese Awards — a beautiful journey through a producer's story, process, people, and cheeses.

### Database Changes
1. **New `producer_sections` table** — Stores dynamic, ordered content sections per producer:
   - Section types: `story`, `process`, `team`, `gallery`, `awards`, `quote`
   - Each has: title, subtitle, body_text, media_url (image/video), background_color, metadata (JSONB)
   - RLS: public read for visible sections
2. **New columns on `producers` table**:
   - `hero_video_url` — Full-screen background video for hero
   - `logo_url` — Producer logo
   - `tagline` — Short producer tagline
   - `founded_year` — Year established
   - `latitude`, `longitude` — For map integration
   - `is_verified` — Verified producer badge

### New Components (`components/producer-showcase/`)
- **`VideoHero`** — Full-screen video/image hero with producer name, tagline, location, verified badge, back/share buttons. Video auto-plays when visible, pauses when scrolled away.
- **`StorySection`** — Full-bleed background image/video with overlaid text, or text-only variant. For "Our History", "Our Philosophy", etc.
- **`ProcessSection`** — Horizontal snap-scroll cards showing step-by-step cheesemaking process with numbered steps and images.
- **`TeamSection`** — Horizontal scroll of team member cards with photos, names, roles, and bios.
- **`GallerySection`** — Dark-themed horizontal photo carousel with captions and fullscreen modal on tap.
- **`AwardsSection`** — Rich-brown themed awards showcase with medal color coding (Super Gold, Gold, Silver, Bronze).
- **`QuoteSection`** — Large italic pull-quote with optional background image, attribution line.

### New Service (`lib/producer-sections-service.ts`)
- `getProducerSections(producerId)` — Fetches all visible sections ordered by sort_order
- `getProducerShowcaseData(producerId)` — Fetches showcase fields from producers table
- TypeScript interfaces: `ProducerSection`, `TeamMember`, `ProcessStep`, `GalleryImage`, `AwardEntry`

### Rebuilt Producer Page (`app/producer/[id].tsx`)
- **Video Hero** replaces old static hero — supports background video with autoplay
- **Scroll-based visibility tracking** — Videos auto-play/pause based on scroll position using `onLayout` + `onScroll`
- **Dynamic sections** rendered based on `section_type` from database
- **"Show on Map" button** — Opens native maps app (iOS Maps / Google Maps) with producer location
- **Share button** — Native share sheet for producer page
- **Backward compatible** — Pages without showcase data still render beautifully with the existing producer info

### Dependencies
- Added `expo-video` for native video playback
- Added `expo-video` plugin to `app.config.js`

### JSONB metadata format examples
- **team**: `{ "members": [{ "name": "...", "role": "...", "image_url": "...", "bio": "..." }] }`
- **process**: `{ "steps": [{ "step": 1, "title": "...", "description": "...", "image_url": "..." }] }`
- **gallery**: `{ "images": [{ "url": "...", "caption": "..." }] }`
- **awards**: `{ "awards": [{ "name": "...", "medal": "Gold", "year": "2024", "image_url": "...", "cheese_name": "..." }] }`
- **quote**: `{ "author": "...", "role": "..." }`

## Clickable Taste Profile Tags (February 22, 2026)

### Made Flavor/Aroma Tags Navigate to Search Results
- **Feature**: Clicking a taste profile tag on any cheese detail page now navigates to the Discover tab with that flavor/aroma as the search query, showing all cheeses matching that profile.

### Changes Made
1. **`components/search/SearchBar.tsx`** + **`components/search/types.ts`**:
   - Added `initialValue` prop to SearchBarProps
   - SearchBar now accepts and syncs with an external initial value
   - Added `useEffect` to re-sync when `initialValue` changes (e.g. navigating between tags)

2. **`app/(tabs)/discover.tsx`**:
   - Added `search` to `useLocalSearchParams` destructuring
   - Initializes `searchQuery` state from URL `search` param
   - Added `useEffect` to sync searchQuery when search param changes
   - Passes `initialValue` to SearchBar component
   - Added `flavor` and `aroma` columns to `producer_cheese_stats` query select
   - Added `flavor` and `aroma` to DiscoverItem metadata type
   - Added flavor (score +9) and aroma (score +7) to fuzzy search scoring

3. **`app/cheese/[id].tsx`**:
   - Changed flavor tags from plain `<View>` to `<TouchableOpacity>`
   - Navigates to `/(tabs)/discover?search={flavor}` on press

4. **`app/producer-cheese/[id].tsx`**:
   - Added `encodeURIComponent()` to existing flavor and aroma tag navigation URLs

### User Experience
- View a cheese detail page → see "Flavor profile" or "Taste Profile" tags
- Tap any tag (e.g. "Nutty", "Creamy", "Earthy")
- Taken to Discover tab with search pre-filled, showing all matching cheeses
- Works on both `/cheese/[id]` and `/producer-cheese/[id]` pages

## Android App Links Verification Fix (January 1, 2026)

### Fixed Play Store Domain Verification Error
- **Issue**: Play Console showed "Domain ownership not verified" for cheezus.co
- **Root Cause**: Missing Digital Asset Links file + custom scheme in autoVerify intent filter

### Changes Made
1. **Created `assetlinks.json`** for cheezus.co domain:
   - File location on web: `https://cheezus.co/.well-known/assetlinks.json`
   - Contains SHA256 fingerprint: `03:D4:5D:7B:3C:94:96:47:B2:09:AE:C4:35:C4:8D:18:D8:22:1B:2E:B2:6E:18:2B:1C:63:CF:12:C0:4F:BD:E8`

2. **Updated `app.config.js`** - Separated intent filters:
   - HTTPS App Links (with `autoVerify: true`) - requires domain verification
   - Custom scheme `cheezus://` (without autoVerify) - no verification needed

### Verified Links
- `https://cheezus.co/@` → Profile deep link
- `https://cheezus.co/profile` → Profile page
- `cheezus://cheezus.co/@` → Custom scheme profile
- `cheezus://cheezus.co/profile` → Custom scheme profile

## iOS App Store Privacy Purpose Strings (December 31, 2025)

### Fixed App Store Rejection - Guideline 5.1.1
- **Issue**: Apple rejected the app because privacy purpose strings did not sufficiently explain how protected resources are used
- **Solution**: Added detailed, example-based purpose strings for all permissions

### Permissions Configured in `app.config.js`

| Permission | iOS Key | Purpose String |
|------------|---------|----------------|
| **Camera** | NSCameraUsageDescription | "Cheezus uses your camera to take photos of cheese for your cheese box entries and to scan cheese labels for automatic identification. For example, you can photograph a cheese wheel to add it to your collection or scan a label to auto-fill cheese details." |
| **Photo Library** | NSPhotoLibraryUsageDescription | "Cheezus accesses your photo library so you can select existing photos of cheese to add to your cheese box entries and set your profile picture. For example, you can choose a photo you took earlier at a cheese shop." |
| **Location** | NSLocationWhenInUseUsageDescription | "Cheezus uses your location to show you cheese shops, producers, and cheese events near you. For example, you can discover local artisan cheese makers in your area." |
| **Microphone** | NSMicrophoneUsageDescription | "Cheezus may use the microphone when recording video of cheese tastings to share with the community." |

### Changes Made
- Added `ios.infoPlist` section with all privacy purpose strings
- Added plugin configurations for:
  - `expo-image-picker` (photosPermission, cameraPermission)
  - `expo-location` (locationWhenInUsePermission)
  - `expo-camera` (cameraPermission, microphonePermission)

### Notes
- Sharing (expo-sharing) does NOT require special permissions on iOS - uses native share sheet
- Contacts are NOT accessed by this app
- Notifications permissions are handled by expo-notifications plugin

## Cheese Type Selection Fix (December 26, 2025)

### Fixed "Failed to add cheese to your box" Error
- **Root Cause**: When users searched and clicked a cheese type tile (showing "New" badge), the app tried to insert the `cheese_type.id` into `cheese_box_entries.cheese_id`, which has a foreign key constraint requiring a `producer_cheese.id`
- **Solution**: Cheese type selections now redirect to the "Add New Cheese" form with prefilled data

### Changes Made
- Updated `components/add-cheese/NewCheeseForm.tsx`:
  - Added `CheeseTypePrefill` interface export
  - Added `prefillData` prop to accept cheese type info
  - Form initializes with prefilled cheese name, type, and origin country

- Updated `app/add-cheese.tsx`:
  - Added `cheeseTypePrefill` state
  - Modified `handleSelectExisting()` to check `cheese.type`:
    - If `cheese_type`: Redirects to NewCheeseForm with prefilled data
    - If `producer_cheese`: Goes to AddToBoxForm (existing behavior)
  - Clear prefill data on back navigation

### User Experience
- Search for "Brie", "Camembert", "Gouda" etc. shows cheese types with "New" badge
- Clicking redirects to add form with cheese name pre-filled
- User adds their producer/version details and rating
- Creates a new producer_cheese under that cheese_type

## Label Scanner Feature (December 18, 2025)

### Added AI-Powered Cheese Label Scanner
- Created `lib/label-scanner.ts` - OpenAI Vision integration for label analysis:
  - `scanCheeseLabel()` - Sends image to OpenAI GPT-4o Vision
  - Extracts: cheese name, producer, origin country, cheese type, milk types, description
  - Returns confidence level (high/medium/low)
  - Supports both Edge Function and direct API calls
  - Comprehensive error handling for various failure cases

### Updated NewCheeseForm with Scanner UI
- Replaced "Identify" button with "Scan Label" button
- Added scanner modal with:
  - Clear instructions for best photo results
  - Tips: ensure label visible, good lighting, text in focus
  - "Take Photo of Label" primary action
  - "Choose from Gallery" secondary option
  - Loading state with "Analyzing label..." message
  - Error display with retry option
- Form auto-prefills with scanned data:
  - Cheese name, producer, origin, type, milk types, description
  - Shows confidence-based success message

### How It Works
1. User taps "Scan Label" button
2. Modal opens with photo tips
3. User takes photo or selects from gallery
4. Image sent to OpenAI Vision API
5. AI extracts label information
6. Form fields auto-populate
7. User reviews and submits

## Interactive Notifications (December 18, 2025)

### Made Notifications Clickable with Navigation
- Updated `app/notifications.tsx` with comprehensive notification handling:
  - **Profile navigation**: `follow`, `friend_milestone` → opens user profile
  - **Cheese navigation**: `following_logged_cheese`, `following_added_wishlist`, `cheese_copied`, `trending_cheese`, `similar_recommendation`, `new_from_producer`, `award_winner`, `seasonal_cheese`, `cheese_near_you`, `wishlist_reminder`, `cheese_approved` → opens cheese detail
  - **Badge modal**: `badge_earned`, `following_earned_badge` → shows badge detail modal

### Added Badge Detail Modal
- Created modal overlay for badge notifications
- Shows badge icon (emoji), name, and description
- "View All Badges" button navigates to badges screen
- Clean close button to dismiss

### Expanded Notification Types
- Added full type definitions for all notification types from push notification system
- Added data fields for badge info: `badge_name`, `badge_description`, `badge_icon`
- Updated icon colors for different notification categories

## Email Confirmation Deep Link Fix (December 18, 2025)

### Fixed Post-Email-Confirmation Redirect
- Updated `app/_layout.tsx` deep link handler
- Added handling for `type=signup` and `type=email` deep links
- Users now land on login screen after confirming email (instead of homescreen)

## Personalized Feed Algorithm (December 2, 2025)

### Added Smart Recommendation Engine
- Created `lib/feed-service.ts` with personalized feed management:
  - `getPersonalizedFeed()` - Fetches mixed feed based on user profile
  - `getUserTasteProfile()` - Analyzes user's cheese box for preferences
  - `interleaveFeedItems()` - Mixes content types for varied feed
  - `getCheeseDisplayName()` - Hides generic producer names

- Created Supabase RPC functions (see `docs/home-feed-functions.md`):
  - `get_user_taste_profile()` - Builds user preferences from ratings
  - `get_personalized_feed()` - Returns categorized recommendations

### Feed Composition
- **Personalized Recommendations** (40%) - Based on user's taste profile
- **Trending/Popular** (25%) - Highly rated cheeses
- **Discovery** (20%) - Random cheeses for exploration
- **Award Winners** - Cheeses with awards_image_url
- **Articles** (20%) - Cheezopedia content
- **Sponsored** (10%) - Promoted pairings

### Cold Start Handling
- New users (0 ratings): Heavy on trending, awards, discovery
- Starting (1-3 ratings): Begin weighting toward preferences
- Building (4-10 ratings): Personalization increases
- Connoisseur (10+ ratings): Full personalization

### Updated Home Screen (`app/(tabs)/index.tsx`)
- Pull-to-refresh resets and reshuffles feed
- Recommendation badges: "For You", "Trending", "Award Winner", "Discover"
- Awards badge overlay on cheese cards
- Personalized greeting based on user tier
- Session-based seen ID tracking

### Awards Image Support
- Added `awards_image_url` to `ProducerCheese` interface
- Awards badge displays on cheese detail hero
- Awards badge displays on producer page cheese grid
- Awards badge displays on home feed cards

## Producer Pages Implementation (December 2, 2025)

### Added Producer Showcase Feature
- Created `lib/producer-service.ts` with full producer data management:
  - `getProducerById()` - Fetch producer with aggregated stats
  - `getProducerCheeses()` - Get all cheeses by a producer
  - `getAllProducers()` - List producers with stats
  - `searchProducers()` - Search producers by name

- Built `app/producer/[id].tsx` - Producer detail page featuring:
  - Hero section with producer image and name
  - Location display (country/region)
  - Stats bar showing: cheese count, average rating, total reviews
  - About section with expandable description
  - Contact section with clickable website, phone, email, address
  - Cheeses grid showing all producer's cheeses with ratings
  - Navigation to individual cheese detail pages

- Updated `app/producer-cheese/[id].tsx`:
  - Added "Made by [Producer]" link card
  - Clicking navigates to producer page
  - Only shows for cheeses with linked producer_id (not generic/unknown)

- Updated `lib/producer-cheese-service.ts`:
  - Added `producer_id` to `ProducerCheese` interface

- Updated `lib/index.ts`:
  - Added export for producer-service

### World Cheese Awards Vision
Goal: Create QR codes for every cheese at World Cheese Awards 2025
- Scan QR → See cheese on Cheezus → View producer showcase
- Producer pages show: story, videos, all their cheeses
- Event-specific badges for engagement
- Immersive tasting experience with cheese box integration

## Expo SDK 54 Upgrade (November 10, 2025)

### Updated Expo SDK Version
- Upgraded from Expo SDK 53 to Expo SDK 54
- Updated all Expo packages to SDK 54 compatible versions:
  - expo-router: upgraded to ~6.0.14 (from 5.1.4)
  - expo-camera: upgraded to ~17.0.9 (from 16.1.11)
  - expo-image-picker: upgraded to ~17.0.8 (from 16.1.4)
  - expo-auth-session: upgraded to ~7.0.8 (from 6.2.1)
  - expo-constants: upgraded to ~18.0.10 (from 17.1.7)
  - expo-crypto: upgraded to ~15.0.7 (from 14.1.5)
  - expo-font: upgraded to ~14.0.9 (from 13.3.2)
  - expo-linking: upgraded to ~8.0.8 (from 7.1.7)
  - expo-location: upgraded to ~19.0.7 (from 18.1.6)
  - expo-splash-screen: upgraded to ~31.0.10 (from 0.30.10)
  - expo-status-bar: upgraded to ~3.0.8 (from 2.2.3)
  - expo-system-ui: upgraded to ~6.0.8 (from 5.0.10)
  - expo-web-browser: upgraded to ~15.0.9 (from 14.2.0)
  - expo-local-authentication: upgraded to ~17.0.7 (from ~16.0.5)
- Updated React Native to version 0.81.5 (from 0.79.6)
- Updated react-native-reanimated to ~4.1.1 (from 3.19.1)
- Cleared bundler cache for fresh start
- App successfully running on SDK 54

## Discover Section Image Display Fix (November 3, 2025)

### Fixed Tile Display Issues
- Fixed discover section tiles showing blank colors instead of actual images
- Replaced placeholder View component with proper Image component
- Now discover section tiles display correctly like homepage/news feed tiles
- Images now properly load from database image_url field

## Profile UI and Stats Enhancement (June 25, 2025)

### Modernized Profile Interface
- Redesigned profile header with modern visual elements
  - Added colored background with rounded corners and shadow effects
  - Improved text styling with proper font weights and subtle text shadows
  - Added premium badge indicator (crown icon) on avatar for premium users
  - Created white border for profile images for better visual distinction

### Improved Stats Display
- Enhanced statistics section with modern design
  - Created overlapping stats container that sits on top of the header
  - Added dividing lines between statistics for clear separation
  - Implemented white background with shadow effect for better contrast
  - Used uppercase labels with proper letter spacing for better readability
  - Added safeNumber helper function to prevent undefined/NaN values in stats

### Feature Preparation
- Updated user statistics for upcoming features
  - Changed "Favorites" stat to "Following" in preparation for user-following functionality
  - Set up structure for tracking followers/following in upcoming development

### Technical Improvements
- Fixed all TypeScript style-related errors
  - Added missing style definitions for all UI components
  - Resolved duplicate style property issues
  - Ensured consistent naming conventions for styles
  - Fixed Typography usage with proper sizes and font families
  - Added proper typing for all component properties

## UX & Data Quality Improvements (June 25, 2025)

### Enhanced Cheese Entry Quality
- Added automatic capitalization for cheese names, origin countries, and regions
  - Implemented a `capitalizeWords` utility function in `cheese-service.ts`
  - Ensures consistent formatting regardless of user input
  - Improves data quality and standardization across the app

### Improved User Flow
- Enhanced submission confirmation UX
  - Added success notification when cheese is successfully added
  - Implemented automatic redirect to cheese details page after brief delay
  - Removed need for users to click 'OK' to continue

### Database Structure Changes
- Added `added_by` column to track cheese ownership
  - Facilitates RLS policies for proper data access control
  - Enables future badge tracking and user contribution statistics
- Updated Row-Level Security (RLS) policies
  - Added policies for authenticated users to manage their own entries
  - Maintains all users' ability to view all cheese entries

## Cheese Photo Upload Implementation (June 25, 2025)

### Added Photo Upload Functionality
- Created Supabase storage utilities (`lib/storage.ts`)
  - Implemented functions to ensure storage bucket exists for cheese photos
  - Added photo upload capability with auto-generated unique filenames (UUIDs)
  - Created utility functions for three photo source options
  - Integrated with Expo ImagePicker for camera and gallery access
  - Added base64-arraybuffer handling for image data

- Implemented three photo upload options in the UI
  - Camera capture: Take a photo directly with the device camera
  - Gallery selection: Choose an existing image from the photo gallery
  - AI analysis: Placeholder for future AI cheese recognition (currently uses gallery selection)

- Added database service layer (`lib/cheese-service.ts`)
  - Created CRUD operations for cheese data
  - Mapped UI state to database schema structure
  - Added proper error handling and validation
  - Implemented functions to save cheese with photo URL references

- Enhanced cheese creation form (`app/cheese/new.tsx`)
  - Added form validation with visual error feedback
  - Integrated with photo upload utilities
  - Improved UX with loading indicators during upload and submission
  - Added preview of uploaded cheese photo
  - Implemented "change photo" capability
  - Connected form submission to database service

- Added comprehensive documentation
  - Created database structure documentation (`docs/database-structure.md`)
  - Documented tables, relationships, and Supabase storage configuration
  - Added inline code comments explaining complex operations

## Badge System Implementation (June 23, 2025)

### Added Badge and Achievement System
- Created database schema for badges (`db/badges-schema.sql`)
  - Added `badges` table to store badge definitions and thresholds
  - Added `user_badges` table to track user progress toward each badge
  - Created triggers to update badge progress when users log new cheeses
- Created database functions for badge management (`db/badge-functions.sql`)
  - Implemented stored procedures to track progress on different badge types
  - Added functions to support quantity, type, and specialty badges
  - Created helper functions for efficient badge updating
  - Added database function for retrieving badges with user progress
- Built UI components for badge display
  - Created reusable `BadgeProgressCard` component with visual progress indicators
  - Implemented badges screen showing all available badges and user progress
  - Designed progress bars and completion indicators
  - Used View-based solution instead of LinearGradient for better compatibility
- Added gamification elements inspired by Duolingo
  - Progress tracking toward next badge level
  - Special achievement badges for cheese specialists (smelly, fresh, hard)
  - Visual rewards for completion
- Integrated badge system with profile screen
  - Added achievements section showing top 5 badges on profile
  - Created "View All" navigation to full badges screen
  - Updated user stats to show badges earned count
  - Improved real-time stats tracking with proper database queries
  - Added emoji icons for each badge category (🧀 for quantity, ⭐ for specialty, etc.)
  - Fixed badge display structure to properly render icons in badge cards
- Added navigation support
  - Configured badge screen in root navigation stack
  - Added styled header with custom title and colors

## UI Improvement Updates (June 23, 2025)

### Fixed Font Inconsistencies
- Updated font in Cheezopedia article view (`app/cheezopedia/[id].tsx`)
- Replaced all Poppins font references with Typography constants from the app's design system
- Ensured consistent typography throughout the article pages, including:
  - Headings using Typography.fonts.heading
  - Body text using Typography.fonts.body and Typography.fonts.bodyMedium
  - Proper font scaling with Typography size constants

### Improved Mobile Scaling for Feed Tiles
- Enhanced responsive design for cheese and article tiles on multiple screens:
  - Home screen (`app/(tabs)/index.tsx`)
  - Discover/Cheezopedia screen (`app/(tabs)/discover.tsx`)
- Implemented dynamic card heights based on screen width (75% for most cards, 90% for featured article cards)
- Added proper horizontal padding (4% margins) on both sides of all tiles
- Made cards slightly narrower (92% width) for better visual spacing
- Used useWindowDimensions hook for real-time screen size adaptation
- Reduced font sizes for better readability on smaller screens
- Added maxWidth constraints (600px) to prevent excessive stretching on larger screens
- Ensured consistent spacing between feed items
- Centered tiles for better visual alignment

## Previous Updates
- Added comprehensive documentation in README.md
- Fixed font inconsistency in add-cheese screen search box and related elements

## Tech Stack Reminder
- React Native with Expo SDK 53
- Supabase backend for authentication and database
- Typography system using Inter and SpaceGrotesk fonts
