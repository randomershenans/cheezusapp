# Cheezus App Database Structure

This document outlines the database structure for the Cheezus app, including tables, relationships, and functions.

## Tables

### Users
Stores user account information.

| Column | Type | Description |
|--------|------|------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | User's email address (unique) |
| username | VARCHAR(50) | User's username (optional) |
| created_at | TIMESTAMP | When the account was created |
| updated_at | TIMESTAMP | When the account was last updated |
| avatar_url | TEXT | URL to user's profile picture |

### Cheeses
Stores information about cheese entries created by users.

| Column | Type | Description |
|--------|------|------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Name of the cheese |
| type | ENUM | Type of cheese (Hard, Soft, Semi-soft, Fresh, Blue, Processed) |
| milk | ENUM | Type of milk used (Cow, Goat, Sheep, Mixed, Buffalo) |
| origin_country | VARCHAR(100) | Country of origin |
| origin_region | VARCHAR(100) | Region of origin |
| description | TEXT | Description of the cheese |
| ageing_period | VARCHAR(50) | How long the cheese is aged |
| image_url | TEXT | URL to the cheese photo in storage |
| added_by | UUID | Foreign key to auth.users - tracks who added the cheese |
| created_at | TIMESTAMP | When the cheese was added |
| updated_at | TIMESTAMP | When the cheese was last updated |

### Flavor Tags
Reusable tags for describing cheese flavors.

| Column | Type | Description |
|--------|------|------------|
| id | UUID | Primary key |
| name | VARCHAR(50) | Tag name (unique) |
| created_at | TIMESTAMP | When the tag was created |

### Cheese Flavor Tags
Junction table connecting cheeses to flavor tags (many-to-many relationship).

| Column | Type | Description |
|--------|------|------------|
| cheese_id | UUID | Foreign key to cheeses table |
| tag_id | UUID | Foreign key to flavor_tags table |

### Cheese Ratings
User ratings and reviews for cheeses.

| Column | Type | Description |
|--------|------|------------|
| id | UUID | Primary key |
| cheese_id | UUID | Foreign key to cheeses table |
| user_id | UUID | Foreign key to users table |
| rating | INTEGER | Rating from 1-5 |
| review | TEXT | User's review (optional) |
| created_at | TIMESTAMP | When the rating was created |
| updated_at | TIMESTAMP | When the rating was last updated |

## Storage Buckets

### cheese-photos
Storage bucket for user-uploaded cheese photos. Photos are stored with a unique UUID filename and can be referenced by their URL in the `cheeses` table's `image_url` column. This bucket is configured with public access.

## Functions

### add_or_update_cheese
Function to create or update a cheese entry with associated flavor tags.

**Parameters:**
- p_id UUID (NULL for new cheeses)
- p_name VARCHAR
- p_type cheese_type
- p_milk_type milk_type
- p_origin_country VARCHAR
- p_origin_region VARCHAR
- p_description TEXT
- p_ageing_period VARCHAR
- p_photo_url TEXT
- p_user_id UUID
- p_flavor_tags TEXT[]

**Returns:** UUID of the created/updated cheese

### get_cheese_with_tags
Function to fetch a cheese with its associated flavor tags.

**Parameters:**
- p_cheese_id UUID

**Returns:** A row containing cheese details and an array of flavor tags

## Row Level Security

Row Level Security (RLS) policies are applied to ensure:
1. Cheeses are viewable by everyone
2. Users can only modify (insert/update/delete) their own cheeses
3. Ratings are viewable by everyone
4. Users can only modify their own ratings

## Data Flow for Cheese Creation

1. User uploads a photo through one of the methods (camera, gallery, AI analysis)
2. Photo is uploaded to the `cheese-photos` storage bucket
3. When the cheese form is submitted, the `add_or_update_cheese` function is called with:
   - Cheese details (name, type, milk, origin, etc.)
   - Photo URL from the storage bucket
   - Array of flavor tags
4. The function creates the cheese record and associates all flavor tags
5. The user is redirected to the cheese detail page or list
