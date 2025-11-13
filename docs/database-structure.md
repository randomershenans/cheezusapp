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

### Cheese Locations
Stores detailed information about cheese origins using a hybrid model that combines geographical indication classification with geospatial data.

| Column | Type | Description |
|--------|------|------------|
| id | BIGINT | Primary key |
| name | VARCHAR(255) | Name of the location |
| description | TEXT | Description of the location |
| coordinates | GEOGRAPHY(POINT) | Precise geospatial coordinates |
| elevation | INTEGER | Elevation in meters above sea level |
| boundary | GEOGRAPHY(POLYGON) | Optional boundary of the region |
| gi_type | gi_type | Type of geographical indication (PDO, PGI, TSG, AOC, etc.) |
| gi_registration_number | VARCHAR(100) | Official registration number |
| gi_registration_date | DATE | When the geographical indication was registered |
| gi_product_category | VARCHAR(100) | Product category under the geographical indication |
| gi_protection_status | VARCHAR(50) | Current protection status |
| traditional_methods | TEXT | Traditional production methods |
| historical_significance | TEXT | Historical significance of the location |
| created_at | TIMESTAMP | When the location was added |
| updated_at | TIMESTAMP | When the location was last updated |
| added_by | UUID | Foreign key to auth.users - tracks who added the location |
| is_deleted | BOOLEAN | Indicates if the record is soft deleted (default: FALSE) |

### Cheese Location Mappings
Junction table connecting cheeses to locations (many-to-many relationship).

| Column | Type | Description |
|--------|------|------------|
| id | BIGINT | Primary key |
| cheese_id | UUID | Foreign key to cheeses table |
| location_id | UUID | Foreign key to cheese_locations table |
| is_primary | BOOLEAN | Indicates if this is the primary location for the cheese |
| created_at | TIMESTAMP | When the mapping was created |
| updated_at | TIMESTAMP | When the mapping was last updated |
| is_deleted | BOOLEAN | Indicates if the record is soft deleted (default: FALSE) |

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

### get_cheese_with_details
Function to fetch a cheese with its associated flavor tags and primary location details.

**Parameters:**
- p_cheese_id UUID

**Returns:** A row containing cheese details, an array of flavor tags, and primary location information

### get_cheese_locations
Function to fetch all locations associated with a cheese.

**Parameters:**
- p_cheese_id UUID

**Returns:** A table of location details for the specified cheese

### find_cheeses_by_location
Function to find cheeses near a specific geographic point.

**Parameters:**
- p_latitude DOUBLE PRECISION
- p_longitude DOUBLE PRECISION
- p_radius INTEGER (radius in meters)

**Returns:** A table of cheeses within the specified radius, including distance from the point

### find_cheeses_by_geographical_indication
Function to find cheeses based on geographical indication characteristics.

**Parameters:**
- p_gi_type gi_type (optional)
- p_gi_product_category VARCHAR (optional)
- p_gi_protection_status VARCHAR (optional)

**Returns:** A table of cheeses matching the specified geographical indication characteristics

### add_or_update_cheese_location
Function to create or update a cheese location.

**Parameters:**
- p_id UUID (NULL for new locations)
- p_name VARCHAR
- p_description TEXT
- p_latitude DOUBLE PRECISION
- p_longitude DOUBLE PRECISION
- p_elevation INTEGER
- p_gi_type gi_type
- p_gi_registration_number VARCHAR
- p_gi_registration_date DATE
- p_gi_product_category VARCHAR
- p_gi_protection_status VARCHAR
- p_traditional_methods TEXT
- p_historical_significance TEXT
- p_boundary TEXT (WKT format for polygon)
- p_user_id UUID

**Returns:** UUID of the created/updated location

### associate_cheese_with_location
Function to associate a cheese with a location.

**Parameters:**
- p_cheese_id UUID
- p_location_id UUID
- p_is_primary BOOLEAN (default: FALSE)

**Returns:** UUID of the created/updated mapping

### soft_delete_cheese_location
Function to soft delete a cheese location and all its associated mappings.

**Parameters:**
- p_location_id UUID
- p_user_id UUID

**Returns:** BOOLEAN indicating success or failure

### soft_delete_cheese_location_mapping
Function to soft delete a cheese location mapping.

**Parameters:**
- p_mapping_id UUID
- p_user_id UUID

**Returns:** BOOLEAN indicating success or failure

### restore_cheese_location
Function to restore a soft-deleted cheese location.

**Parameters:**
- p_location_id UUID
- p_user_id UUID

**Returns:** BOOLEAN indicating success or failure

### restore_cheese_location_mapping
Function to restore a soft-deleted cheese location mapping.

**Parameters:**
- p_mapping_id UUID
- p_user_id UUID

**Returns:** BOOLEAN indicating success or failure

### add_or_update_cheese_with_location
Function to create or update a cheese with associated flavor tags and location information.

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
- p_location_id UUID (optional, existing location ID)
- p_location_name VARCHAR (required if creating new location)
- p_location_description TEXT
- p_latitude DOUBLE PRECISION
- p_longitude DOUBLE PRECISION
- p_elevation INTEGER
- p_gi_type gi_type
- p_gi_registration_number VARCHAR
- p_gi_registration_date DATE
- p_gi_product_category VARCHAR
- p_gi_protection_status VARCHAR
- p_traditional_methods TEXT
- p_historical_significance TEXT
- p_boundary TEXT (WKT format for polygon)
- p_is_primary_location BOOLEAN (default: TRUE)

**Returns:** A row containing the cheese_id and location_id

## Row Level Security

Row Level Security (RLS) policies are applied to ensure:
1. Cheeses are viewable by everyone
2. Users can only modify (insert/update/delete) their own cheeses
3. Ratings are viewable by everyone
4. Users can only modify their own ratings
5. Locations are viewable by everyone
6. Users can only modify their own locations
7. Cheese-location mappings are viewable by everyone
8. Users can only modify mappings for cheeses they own

## Data Flow for Cheese Creation

1. User uploads a photo through one of the methods (camera, gallery, AI analysis)
2. Photo is uploaded to the `cheese-photos` storage bucket
3. When the cheese form is submitted, the `add_or_update_cheese` function is called with:
   - Cheese details (name, type, milk, origin, etc.)
   - Photo URL from the storage bucket
   - Array of flavor tags
4. The function creates the cheese record and associates all flavor tags
5. The user is redirected to the cheese detail page or list
