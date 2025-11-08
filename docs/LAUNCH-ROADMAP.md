# Cheezus App - Launch Roadmap

## 🎯 Pre-Launch Checklist

---

## 📱 **1. Push Notifications**

### **Priority:** High
### **Estimated Time:** 4-6 hours

### **What We Need:**

#### **Setup (1 hour)**
```bash
# Install packages
npx expo install expo-notifications expo-device expo-constants

# Add to app.json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FCD95B"
        }
      ]
    ]
  }
}
```

#### **Database Schema**
```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT, -- 'ios' or 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);
```

#### **Notification Types to Implement**

**Immediate Notifications:**
- 🏆 **Badge Unlocked** - "You earned the Blue Cheese Explorer badge!"
- 🎉 **Milestone Reached** - "You've tried 10 cheeses!"
- ⭐ **Review Response** - Someone liked your review (future social feature)

**Scheduled Notifications:**
- 📊 **Weekly Digest** - "You tried 5 new cheeses this week!"
- 🧀 **Personalized Recommendations** - "Try Comté based on your taste"
- 📚 **New Content** - "New guide: Building the Perfect Cheese Board"

**Engagement Notifications:**
- 💡 **Reminder** - "Haven't logged a cheese in a while?"
- 🎯 **Challenge** - "Try a new cheese type this week!"

#### **Implementation Steps**

1. **Request Permissions** (30 min)
   - Check device capability
   - Request user permission
   - Handle permission states

2. **Token Management** (1 hour)
   - Register device token
   - Store in database
   - Update on app start
   - Clean up old tokens

3. **Supabase Edge Function** (2 hours)
   - Create `send-push-notification` function
   - Integrate with Expo Push API
   - Handle batch sending
   - Error handling & retries

4. **Database Triggers** (1 hour)
   - Badge unlock → notification
   - New content → notification
   - Scheduled jobs for digests

5. **In-App Handling** (30 min)
   - Receive notifications
   - Handle notification taps
   - Navigate to relevant screens
   - Update badge counts

#### **Code Example**
```typescript
// Request permission and get token
import * as Notifications from 'expo-notifications';

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Save to database
  await supabase.from('push_tokens').upsert({
    user_id: user.id,
    token: token.data,
    device_type: Platform.OS,
  });
};
```

#### **Supabase Edge Function**
```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { userId, title, body, data } = await req.json();
  
  // Get user's push tokens
  const tokens = await getTokens(userId);
  
  // Send via Expo Push API
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));
  
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
});
```

---

## 👥 **2. Follow/Unfollow Functionality**

### **Priority:** Medium-High
### **Estimated Time:** 6-8 hours

### **What We Need:**

#### **Database Schema**
```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-follows and duplicates
  CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Add follower counts to profiles
ALTER TABLE profiles
ADD COLUMN follower_count INTEGER DEFAULT 0,
ADD COLUMN following_count INTEGER DEFAULT 0;

-- Function to update counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON user_follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
```

#### **Features to Build**

1. **Follow Button Component** (1 hour)
   - Follow/Unfollow toggle
   - Loading states
   - Optimistic updates

2. **Followers/Following Lists** (2 hours)
   - View who follows you
   - View who you're following
   - Search & filter

3. **Activity Feed Integration** (3 hours)
   - Integrate to existing home feed
   - Show followed users' activity
   - Recent cheese tastings
   - Badge unlocks
   - Reviews
   - Mix with discovery content

4. **Privacy Integration** (1 hour)
   - Respect profile visibility settings
   - Friends-only content
   - Block functionality

5. **Notifications** (1 hour)
   - New follower notification
   - Followed user activity

#### **UI Screens Needed**
- User profile (add Follow button)
- Followers list screen
- Following list screen
- Activity feed tab
- User search/discovery

---

## 📧 **3. Transactional Emails**

### **Priority:** High
### **Estimated Time:** 4-5 hours

### **What We Need:**

#### **Email Service Setup** (1 hour)
**Options:**
- **Resend** (Recommended) - Modern, great DX
- **SendGrid** - Enterprise-grade
- **Postmark** - Transactional specialist

```bash
# Using Resend
npm install resend
```

#### **Email Types Needed**

**Authentication Emails:** (Supabase handles these)
- ✅ Welcome email
- ✅ Email verification
- ✅ Password reset
- ✅ Magic link login

**Custom Transactional Emails:**
1. **Welcome Series** (1 hour)
   - Day 1: Welcome, getting started
   - Day 3: Tips for using the app
   - Day 7: Feature highlights

2. **Activity Emails** (1 hour)
   - Badge unlocked
   - Weekly digest
   - Milestone reached
   - New follower

3. **Engagement Emails** (1 hour)
   - "We miss you" (dormant users)
   - Personalized recommendations
   - New content alerts

4. **Account Emails** (1 hour)
   - Settings changed
   - Email changed confirmation
   - Account deletion confirmation
   - Data export ready

#### **Implementation**

**Supabase Edge Function:**
```typescript
// supabase/functions/send-email/index.ts
import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  const { to, template, data } = await req.json();
  
  const templates = {
    badge_unlocked: {
      subject: '🏆 You unlocked a new badge!',
      html: badgeUnlockedTemplate(data),
    },
    weekly_digest: {
      subject: '📊 Your weekly cheese summary',
      html: weeklyDigestTemplate(data),
    },
    // ... more templates
  };
  
  await resend.emails.send({
    from: 'Cheezus <hello@cheezusapp.com>',
    to,
    ...templates[template],
  });
});
```

**Email Templates:**
- Use React Email or MJML for responsive templates
- Consistent branding (yellow primary color)
- Clear CTAs
- Unsubscribe links (required by law)

#### **Database Additions**
```sql
CREATE TABLE email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  marketing_emails BOOLEAN DEFAULT true,
  activity_emails BOOLEAN DEFAULT true,
  digest_emails BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 **4. Additional Pre-Launch Essentials**

### **A. Onboarding Flow** ⭐ CRITICAL

**Priority:** HIGH
**Time:** 3-4 hours

**What We Need:**
1. **Welcome Screen**
   - App value proposition
   - Beautiful imagery
   - "Get Started" CTA

2. **Taste Profile Quiz** (Optional but valuable)
   - Favorite cheese types
   - Flavor preferences
   - Dietary restrictions
   - Use for personalization

3. **Permission Requests**
   - Push notifications (with clear value)
   - Location (for local shops & map features)
   - Photo library (for cheese photos)

**Implementation:**
- Use `AsyncStorage` to track onboarding completion
- Skip for existing users
- Allow skip/dismiss but encourage completion

---

### **B. Search Functionality Improvements** ⭐ CRITICAL

**Priority:** HIGH
**Time:** 4-6 hours
**Status:** Basic search exists, needs enhancement

**What We Need to Add:**
1. **Enhanced Global Search**
   - ✅ Search cheeses by name (Done)
   - Add: Search by type, origin
   - Add: Search pairings
   - Add: Search Cheezopedia articles
   - Add: Recent searches history
   - Add: Search suggestions/autocomplete

2. **Advanced Filters**
   - Cheese type (hard, soft, blue, etc.)
   - Origin country/region
   - Milk type (cow, goat, sheep)
   - Flavor profile
   - Ageing period
   - Save favorite filters

3. **Search Screen Enhancements**
   - Trending searches
   - Recent searches with clear history
   - Popular cheeses
   - Quick filter chips
   - Sort options (alphabetical, rating, popularity)

4. **Search Results**
   - Better result cards with images
   - Highlight matching text
   - "No results" suggestions
   - Filter result counts

**Database Improvements:**
```sql
-- Full text search on cheeses
CREATE INDEX idx_cheeses_search 
ON cheeses 
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Search on pairings
CREATE INDEX idx_pairings_search
ON cheese_pairings
USING GIN (to_tsvector('english', pairing || ' ' || COALESCE(description, '')));

-- Search on Cheezopedia
CREATE INDEX idx_cheezopedia_search
ON cheezopedia_entries
USING GIN (to_tsvector('english', title || ' ' || content || ' ' || description));
```

---

### **C. Error Handling & Offline Mode**

**Priority:** MEDIUM-HIGH
**Time:** 3-4 hours

**What We Need:**
1. **Error Boundaries**
   - Catch JS errors
   - Show friendly error screens
   - Log to error tracking service

2. **Network Error Handling**
   - Detect offline state
   - Queue actions for when online
   - Show offline banner

3. **Error Tracking**
   - Sentry or similar
   - Track crashes
   - Monitor performance

**Implementation:**
```typescript
// Error boundary component
// Offline state management
// Retry logic for failed requests
```

---

### **D. Product Analytics** ⭐ CRITICAL

**Priority:** HIGH
**Time:** 2-3 hours
**Service:** Amplitude

**What to Track:**
- **User Events:**
  - User signups / registrations
  - Login / logout
  - Profile updates
  
- **Core Features:**
  - Cheese box entries (add/edit/delete)
  - Cheese ratings
  - Badge unlocks
  - Pairing views
  - Article/recipe views
  - Bookmarks (add/remove)
  
- **Engagement:**
  - Screen views / session duration
  - Search queries
  - Filter usage
  - Share actions
  - Follow/unfollow (when implemented)
  
- **Retention Metrics:**
  - Daily/Weekly/Monthly active users
  - User retention cohorts
  - Feature adoption rates
  - Churn indicators

**Implementation:**
```bash
npm install @amplitude/analytics-react-native
```

**Events Structure:**
```typescript
// Example events
amplitude.track('Cheese Added', {
  cheese_id: cheese.id,
  cheese_name: cheese.name,
  rating: rating,
  has_notes: !!notes,
});

amplitude.track('Badge Unlocked', {
  badge_id: badge.id,
  badge_name: badge.name,
  badge_category: badge.category,
  user_progress: progress,
});
```

**User Properties:**
```typescript
amplitude.setUserId(user.id);
amplitude.identify({
  email: user.email,
  signup_date: user.created_at,
  premium: user.premium,
  total_cheeses: cheeseCount,
  total_badges: badgeCount,
});
```

---

### **E. Legal & Compliance** ⭐ CRITICAL

**Priority:** HIGH (Required for App Store)
**Time:** 2-4 hours

**What We Need:**
1. **Privacy Policy**
   - What data we collect
   - How we use it
   - GDPR compliance
   - Data deletion process

2. **Terms of Service**
   - User responsibilities
   - Content guidelines
   - Liability disclaimers

3. **In-App Display**
   - Link in settings
   - Link in signup flow
   - Accept terms checkbox

**Resources:**
- Use template generators (termly.io, iubenda)
- Have lawyer review (recommended)
- Keep accessible from app

---

### **F. App Store Assets** ⭐ CRITICAL

**Priority:** HIGH
**Time:** 4-6 hours

**iOS App Store:**
- App icon (1024x1024)
- Screenshots (6.5", 5.5" displays)
- App preview video (optional)
- Description copy
- Keywords
- Privacy labels

**Google Play Store:**
- Feature graphic (1024x500)
- Screenshots
- App description
- Categories
- Content rating questionnaire

---

### **G. Content Moderation**

**Priority:** MEDIUM
**Time:** 2-3 hours

**What We Need:**
1. **Report System**
   - Report inappropriate reviews
   - Report users
   - Flag content

2. **Admin Dashboard**
   - Review reported content
   - Ban users
   - Delete inappropriate content

3. **Automated Filtering**
   - Profanity filter
   - Spam detection

---

### **H. Help & Support**

**Priority:** MEDIUM
**Time:** 2-3 hours

**What We Need:**
1. **FAQ Section**
   - Common questions
   - Getting started guide
   - Troubleshooting

2. **Contact Support**
   - In-app support form
   - Email support
   - Response time expectations

3. **Bug Reporting**
   - Easy bug report flow
   - Screenshot attachment
   - Auto-include device info

---

### **I. Performance Optimization**

**Priority:** MEDIUM
**Time:** 3-4 hours

**What to Do:**
1. **Image Optimization**
   - Lazy loading
   - Proper sizing
   - CDN caching

2. **List Performance**
   - FlatList optimization
   - Pagination
   - Virtual scrolling

3. **Bundle Size**
   - Remove unused dependencies
   - Code splitting
   - Asset optimization

---

### **J. Interactive Map Feature** 🗺️

**Priority:** LOW (Post-Launch)
**Time:** 8-12 hours

**What We Need:**

#### **1. Map View with Cheeses** (4 hours)
- **Visual cheese origins on map**
  - Pin each cheese to its origin location
  - Cluster markers for regions
  - Tap cheese marker to see details
  - Filter by cheese type
  - Color-code by categories

#### **2. Local Places Discovery** (4-6 hours)
- **Cheese Shops & Retailers**
  - Find nearby cheese shops
  - Store details (hours, contact, reviews)
  - Navigate to location
  - Call/website links
  
- **Cheese Producers/Farms**
  - Local cheesemakers
  - Tour information
  - Visit hours
  - Special events

- **Restaurants & Cafés**
  - Places with cheese boards
  - Wine bars with cheese
  - Cheese-focused restaurants

#### **3. Database Schema**
```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'shop', 'producer', 'restaurant'
  description TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  website TEXT,
  hours JSONB,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(2,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST (
  ll_to_earth(latitude, longitude)
);

-- User-submitted places
CREATE TABLE user_place_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  place_id UUID REFERENCES places(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **4. Features**
- 📍 **Current location** - Center on user
- 🔍 **Search places** - Find specific shops
- 🎯 **Filter by type** - Shops, producers, restaurants
- 📏 **Distance filter** - Within X miles
- ⭐ **Ratings & reviews** - Community feedback
- 🚗 **Navigation** - Open in Maps app
- ➕ **Submit new places** - Community-driven

#### **5. Implementation**
```bash
npx expo install react-native-maps
```

**Map Libraries:**
- iOS: Apple Maps
- Android: Google Maps
- Clustering: react-native-map-clustering

---

### **K. Cheese Board Maker** 🧀✨

**Priority:** MEDIUM (Unique Feature!)
**Time:** 10-15 hours

**What We Need:**

#### **1. Wizard Flow** (4 hours)
**Step 1: Occasion**
- Dinner party
- Wine tasting
- Casual gathering
- Romantic evening
- Holiday celebration

**Step 2: Guest Count**
- Slider: 2-20+ people
- Auto-calculate portions

**Step 3: Preferences**
- Flavor profiles (mild, bold, adventurous)
- Dietary restrictions
- Budget range
- Texture preferences

**Step 4: Pairings**
- Wine pairings
- Beer pairings
- Accompaniments (fruits, nuts, spreads)

#### **2. Smart Algorithm** (3 hours)
```typescript
interface CheeseBoard {
  cheeses: Cheese[];
  quantities: { [key: string]: string };
  pairings: Pairing[];
  accompaniments: string[];
  plating_suggestions: string;
  shopping_list: ShoppingItem[];
}

// Algorithm considers:
- Variety (different types, textures, flavors)
- Balance (mild → strong progression)
- Visual appeal (colors, shapes)
- Pairing compatibility
- Seasonal availability
- Budget constraints
```

#### **3. Beautiful Results Screen** (4 hours)
- 🎨 **Visual board layout**
  - Interactive plating diagram
  - Drag to rearrange
  - Zoom & pan
  
- 📋 **Shopping list**
  - Organized by category
  - Quantities specified
  - Check off items
  - Export to Notes
  
- 🍷 **Pairing recommendations**
  - Wine/beer suggestions
  - Accompaniments
  - Serving tips
  
- 📸 **Share your board**
  - Beautiful shareable image
  - Social media ready
  - Save to favorites

#### **4. Plating Guide** (2 hours)
- **Visual guide** - Where to place each cheese
- **Clock method** - Mild at 12, strong at 6
- **Garnish suggestions** - Fruits, nuts, honey
- **Serving temperatures** - When to remove from fridge
- **Cutting guides** - How to slice each type

#### **5. Save & Reuse** (2 hours)
- Save favorite boards
- Edit saved boards
- Share boards with friends
- Community boards (discover others)

#### **6. Database Schema**
```sql
CREATE TABLE cheese_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  occasion TEXT,
  guest_count INTEGER,
  preferences JSONB,
  cheeses JSONB, -- Array of cheese IDs with quantities
  pairings JSONB,
  accompaniments TEXT[],
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cheese_boards_user ON cheese_boards(user_id);
CREATE INDEX idx_cheese_boards_public ON cheese_boards(is_public) WHERE is_public = true;
```

---

### **L. Multi-Language Support** 🌍

**Priority:** LOW-MEDIUM (Post-Launch)
**Time:** 15-20 hours per language

**Languages to Add:**
1. 🇪🇸 **Spanish** - Large market
2. 🇫🇷 **French** - Cheese capital
3. 🇮🇹 **Italian** - Cheese culture
4. 🇩🇪 **German** - European market

**What We Need:**

#### **1. Internationalization Setup** (3 hours)
```bash
npm install i18next react-i18next
npm install expo-localization
```

**Create translation files:**
```typescript
// locales/en.json
{
  "common": {
    "cheese": "Cheese",
    "pairing": "Pairing",
    "save": "Save"
  },
  "cheese_box": {
    "add_cheese": "Add Cheese",
    "rating": "Rating"
  }
}
```

#### **2. Content Translation** (8-12 hours per language)
- **App UI** - All buttons, labels, messages
- **Cheese descriptions** - Database content
- **Pairing descriptions** - Database content  
- **Cheezopedia articles** - Full articles
- **Badge names & descriptions**
- **Error messages**
- **Onboarding content**

#### **3. Database Schema**
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'cheese', 'pairing', 'article'
  entity_id UUID NOT NULL,
  language TEXT NOT NULL,
  field TEXT NOT NULL, -- 'name', 'description', 'content'
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, language, field)
);

CREATE INDEX idx_translations_lookup 
ON translations(entity_type, entity_id, language);
```

#### **4. Implementation Checklist**
- [ ] Set up i18next configuration
- [ ] Create translation JSON files
- [ ] Translate UI strings
- [ ] Add language selector (already in Preferences!)
- [ ] Translate database content
- [ ] Handle RTL languages (future: Arabic)
- [ ] Date/number formatting
- [ ] Currency formatting
- [ ] Test on different locales

#### **5. Professional Translation**
**Options:**
- **Crowdsourcing** - Community translations (free but quality varies)
- **Translation services** - Gengo, Transifex (moderate cost)
- **Professional agencies** - High quality, high cost
- **Hybrid approach** - Professional for core, community for content

**Estimated Costs:**
- ~$0.05-0.15 per word
- ~10,000-15,000 words per language
- **$500-2,000 per language**

---

### **M. ML Cheese Analysis Integration** 🤖

**Priority:** MEDIUM-HIGH
**Time:** 6-10 hours

**What We Need:**

#### **1. Connect Existing ML Model** (4-6 hours)
- **ML Model Details:**
  - What does it analyze? (cheese type, age, quality, flavor profile?)
  - Input format (images, text descriptions?)
  - Output format (predictions, confidence scores?)
  
- **Integration Points:**
  - Camera integration for cheese photos
  - Process image through ML model
  - Display results to user
  - Save analysis to cheese box entry

#### **2. ML Analysis Features** (3-4 hours)
- 📸 **Photo Analysis**
  - Take/upload cheese photo
  - Identify cheese type
  - Suggest similar cheeses
  - Detect quality indicators
  
- 🎯 **Pairing Suggestions**
  - ML-powered pairing recommendations
  - Based on cheese characteristics
  - Confidence scores
  
- 📊 **Flavor Profile Detection**
  - Analyze visual characteristics
  - Predict flavor notes
  - Age estimation

#### **3. Database Schema**
```sql
CREATE TABLE ml_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  cheese_box_entry_id UUID REFERENCES cheese_box(id),
  image_url TEXT NOT NULL,
  predictions JSONB, -- ML model output
  confidence_score DECIMAL(3,2),
  identified_cheese_id UUID REFERENCES cheeses(id),
  analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_analyses_user ON ml_analyses(user_id);
CREATE INDEX idx_ml_analyses_entry ON ml_analyses(cheese_box_entry_id);
```

#### **4. Implementation**
```typescript
// ML Analysis Service
interface MLAnalysisResult {
  cheeseType: string;
  confidence: number;
  suggestedCheeses: string[];
  flavorProfile: string[];
  pairingRecommendations: string[];
}

const analyzeCheesePhoto = async (imageUri: string): Promise<MLAnalysisResult> => {
  // Call ML API endpoint
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'cheese.jpg',
  });
  
  const response = await fetch('YOUR_ML_API_ENDPOINT', {
    method: 'POST',
    body: formData,
  });
  
  return await response.json();
};
```

#### **5. User Flow**
1. User taps "Analyze Cheese" in cheese box
2. Takes photo or selects from library
3. Photo sent to ML model
4. Results displayed with confidence
5. User can accept/edit suggestions
6. Analysis saved with cheese entry

---

### **N. Data Migration Tasks** 🔄

**Priority:** CRITICAL (Before Production Launch)
**Time:** 4-8 hours

**What We Need:**

#### **1. User Profile Migration** (1-2 hours)
**From:** Development/Test Database
**To:** Production Database

**Migration Steps:**
```sql
-- Export user profiles
COPY (
  SELECT * FROM profiles
  WHERE created_at >= 'YOUR_BETA_START_DATE'
) TO '/tmp/profiles_export.csv' WITH CSV HEADER;

-- Import to production
COPY profiles FROM '/tmp/profiles_export.csv' WITH CSV HEADER;

-- Verify counts match
SELECT COUNT(*) FROM profiles;
```

**Data to Migrate:**
- User profiles (id, name, email, avatar_url)
- Profile stats (follower counts, cheese counts)
- User preferences
- Privacy settings
- Authentication records (handled by Supabase Auth)

**Checklist:**
- [ ] Backup current production data
- [ ] Export beta user profiles
- [ ] Verify data integrity
- [ ] Import to production
- [ ] Test user logins
- [ ] Verify profile data displays correctly

---

#### **2. Cheese Database Migration** (2-3 hours)
**From:** CSV/JSON seed data or test DB
**To:** Production Database

**Migration Steps:**
```sql
-- Cheeses table
COPY (
  SELECT id, name, type, milk, origin_country, origin_region,
         description, ageing_period, image_url, created_at
  FROM cheeses
) TO '/tmp/cheeses_export.csv' WITH CSV HEADER;

-- Import to production
COPY cheeses FROM '/tmp/cheeses_export.csv' WITH CSV HEADER;

-- Cheese flavors
COPY cheese_flavors FROM '/tmp/cheese_flavors_export.csv' WITH CSV HEADER;
```

**Data to Migrate:**
- ✅ All cheese records (~100-1000+ cheeses)
- ✅ Cheese flavors & tags
- ✅ Cheese images (CDN URLs)
- ✅ Metadata (origin, type, milk, ageing)

**Data Quality Checks:**
- [ ] All cheeses have images
- [ ] All required fields populated
- [ ] No duplicate entries
- [ ] Foreign key relationships intact
- [ ] Text encoding correct (special characters)

---

#### **3. Pairing Database Migration** (1-2 hours)
**From:** Seed data or test DB
**To:** Production Database

**Migration Steps:**
```sql
-- Pairings table
COPY cheese_pairings FROM '/tmp/pairings_export.csv' WITH CSV HEADER;

-- Pairing matches (junction table)
COPY cheese_pairing_matches FROM '/tmp/pairing_matches_export.csv' WITH CSV HEADER;
```

**Data to Migrate:**
- ✅ All pairing records (wine, beer, food, etc.)
- ✅ Cheese-pairing relationships
- ✅ Pairing descriptions
- ✅ Featured images
- ✅ Sponsored pairing flags

**Verification:**
- [ ] All pairings have descriptions
- [ ] Cheese-pairing relationships valid
- [ ] No orphaned records
- [ ] Sponsored pairings flagged correctly
- [ ] Images accessible

---

#### **4. Migration Checklist & Scripts**

**Pre-Migration:**
```bash
#!/bin/bash
# pre_migration_backup.sh

# Backup production database
pg_dump $PROD_DB_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Export current data counts
psql $PROD_DB_URL -c "SELECT 'profiles' as table, COUNT(*) FROM profiles
UNION ALL SELECT 'cheeses', COUNT(*) FROM cheeses
UNION ALL SELECT 'pairings', COUNT(*) FROM cheese_pairings;" > pre_migration_counts.txt
```

**Migration Script:**
```bash
#!/bin/bash
# run_migration.sh

echo "Starting data migration..."

# 1. User profiles
echo "Migrating user profiles..."
psql $PROD_DB_URL < migrations/01_profiles.sql

# 2. Cheese data
echo "Migrating cheese database..."
psql $PROD_DB_URL < migrations/02_cheeses.sql

# 3. Pairings
echo "Migrating pairings..."
psql $PROD_DB_URL < migrations/03_pairings.sql

# 4. Verify
echo "Verifying migration..."
psql $PROD_DB_URL < migrations/04_verify.sql

echo "Migration complete!"
```

**Post-Migration Verification:**
```sql
-- Verify record counts
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'cheeses', COUNT(*) FROM cheeses
UNION ALL
SELECT 'cheese_pairings', COUNT(*) FROM cheese_pairings
UNION ALL
SELECT 'cheese_box', COUNT(*) FROM cheese_box;

-- Check for orphaned records
SELECT 'Orphaned flavors' as check_name, COUNT(*) 
FROM cheese_flavors cf
WHERE NOT EXISTS (SELECT 1 FROM cheeses c WHERE c.id = cf.cheese_id);

SELECT 'Orphaned pairing matches', COUNT(*) 
FROM cheese_pairing_matches cpm
WHERE NOT EXISTS (SELECT 1 FROM cheeses c WHERE c.id = cpm.cheese_id);

-- Verify images accessible
SELECT COUNT(*) as missing_images
FROM cheeses
WHERE image_url IS NULL OR image_url = '';
```

**Rollback Plan:**
```bash
#!/bin/bash
# rollback_migration.sh

# If migration fails, restore from backup
psql $PROD_DB_URL < "backup_TIMESTAMP.sql"
```

---

### **O. Social Sharing**

**Priority:** LOW-MEDIUM
**Time:** 2-3 hours

**What We Need:**
1. **Share Functionality**
   - Share cheese to social media
   - Share pairings
   - Share cheese boards (new!)
   - Share profile/achievements
   - Deep linking support

2. **Open Graph Tags**
   - Rich previews when shared
   - Branded images

---

## 📋 **Launch Checklist Summary**

### **Must Have (Before Launch)** ⭐
- [x] Core app functionality (Done!)
- [x] User authentication (Done!)
- [x] Profile system (Done!)
- [x] Bookmarking (Done!)
- [x] Settings pages (Done!)
- [ ] **Data Migration** (CRITICAL)
  - [ ] Migrate user profiles to production
  - [ ] Migrate cheese database to production
  - [ ] Migrate pairings to production
- [ ] Onboarding flow
- [ ] Search improvements (basic exists, needs enhancement)
- [ ] Error handling & offline support
- [ ] Privacy policy & Terms
- [ ] App store assets
- [ ] Amplitude analytics integration

### **High Priority (Soon After Launch)** 🔥
- [ ] **ML Cheese Analysis Integration** (unique AI feature!)
- [ ] Push notifications system
- [ ] Follow/Unfollow functionality
- [ ] Transactional emails
- [ ] Cheese Board Maker (unique feature!)
- [ ] Help & support system

### **Medium Priority (Post-Launch Features)**
- [ ] Interactive map (cheese origins + local places)
- [ ] Multi-language support (ES, FR, IT, DE)
- [ ] Content moderation tools
- [ ] Social sharing enhancements
- [ ] Performance optimization
- [ ] Advanced search filters

### **Nice to Have (Future Enhancements)**
- [ ] Offline mode with sync
- [ ] Admin dashboard
- [ ] A/B testing framework
- [ ] Community cheese boards
- [ ] AR cheese scanning
- [ ] Voice search

---

## ⏱️ **Time Estimates**

**Pre-Launch Essentials:** 20-30 hours
**High Priority Post-Launch:** 30-40 hours
**Medium Priority Features:** 40-60 hours
**Nice to Have:** 20+ hours

**Total to MVP Launch:** ~20-30 hours of focused work
**Total for Phase 1 (MVP + High Priority):** ~50-70 hours

---

## 🎯 **Recommended Launch Order**

### **Phase 0: Pre-Launch (2-3 weeks)** ⭐
**Week 1: Core Polish**
1. Onboarding flow (3-4h)
2. Search improvements (4-6h)
3. Error handling (3-4h)
4. Amplitude analytics (2-3h)

**Week 2: Legal, Assets & Migration** 🔄
5. Privacy policy & Terms (2-4h)
6. App store assets (4-6h)
7. **Data migration to production** (4-8h) - CRITICAL
   - Migrate user profiles
   - Migrate cheese database
   - Migrate pairings
   - Verify data integrity
8. Testing & bug fixes (4-6h)

**Week 3: Launch Prep**
9. Beta testing with real users
10. Final QA & polish
11. Soft launch to limited audience

---

### **Phase 1: Post-Launch Critical (Weeks 4-6)** 🔥
**Week 4: Engagement Features**
12. Push notifications setup (4-6h)
13. Transactional emails (4-5h)
14. Analytics review & optimization (2h)

**Week 5-6: AI & Unique Features** 🤖
15. **ML Cheese Analysis Integration** (6-10h) - AI POWERED!
16. Follow/unfollow functionality (6-8h)
17. **Cheese Board Maker** (10-15h) - UNIQUE SELLING POINT
18. Help & support system (2-3h)

---

### **Phase 2: Differentiation (Weeks 7-10)**
**Week 7-8: Interactive Map**
19. Map feature - cheese origins (4h)
20. Map feature - local places (4-6h)
21. Place submission system (2h)

**Week 9-10: Internationalization**
22. i18n setup (3h)
23. Spanish translation (15-20h)
24. French translation (15-20h)

---

### **Phase 3: Scale & Polish (Ongoing)**
23. Additional languages (IT, DE)
24. Content moderation tools
25. Performance optimization
26. Advanced features (offline, A/B testing)
27. Community features expansion

---

**Status:** Ready for sprint planning! 🚀
**Next Steps:** Prioritize based on launch timeline
**Date:** November 8, 2024
