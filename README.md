# Cheezus App

## Overview
Cheezus is the definitive app for cheese lovers to learn, track, and share their cheese experiences. Whether you're exploring a funky blue from France or pairing a Manchego with Rioja, Cheezus helps you build your cheese knowledge and log your journey in a fun, user-centric way.

## 📌 Vision
To become the go-to app for cheese discovery, education, and enjoyment — a tool that enhances how people connect with food, learn about flavor, and share moments around cheese.

## 🎯 Mission
To empower cheese lovers to explore the world of cheese through accessible, beautifully designed tools for tracking, pairing, and learning — whether you're a casual taster or a dedicated turophile.

## 🌟 North Star Metric
Recurring User Time — with Cheeses Logged as a primary indicator of engagement.

We measure success by how often users return to the app to log cheeses, explore pairings, or learn something new. The more meaningful and repeatable the experience, the stronger the brand and community.

## 🧩 Core User Flows
- **Cheese Lookup** → Discover taste profile, origin, and pairings.
- **Pairing Lookup** → Explore cheeses that go with a given wine, beer, or ingredient.
- **Cheese Logging** → Add a cheese to your personal "Cheese Box" with notes and ratings.
- **Social Sharing** → Share cheese discoveries with friends, driving organic growth.

## 💼 Business Goals
- Build a loyal user base that returns weekly.
- Create lightweight monetization through:
  - Premium features (e.g., detailed pairing tools, collection export)
  - Brand partnerships (cheesemongers, wine merchants)
  - Affiliate revenue (pairing suggestions → buy links)
- Reduce server/app costs via better infrastructure planning.

## 🧭 Product Principles
- **Educate through delight:** Make learning about cheese intuitive and enjoyable.
- **Niche-first, not niche-only:** Focus on depth, not breadth.
- **Zero snobbery:** Make cheese approachable and inclusive.
- **Design matters:** Beautiful UI for a beautiful subject.

## 👥 Audience
- Curious tasters
- Cheese nerds
- Foodies and wine lovers
- Sommeliers and educators

## 🛠️ Technical Architecture

### Tech Stack
- **Frontend**: React Native with Expo (SDK 53)
- **Backend**: Supabase for authentication, database, and storage
- **State Management**: React Context API
- **Navigation**: Expo Router
- **UI Libraries**: Lucide React Native for icons, custom components

### Key Features & Components

#### 🏠 Home Screen
- Trending cheeses
- Featured articles and recipes
- Nearby cheese shops (using location services)
- Recent activity feed

#### 🧀 Cheese Box
- Personal collection of logged cheeses
- Ratings, notes, and favorites
- Analytics on tasting history
- Export and sharing options

#### 🔍 Discover
- Categorized browsing of content
- Filtering by cheese type, region, and more
- Articles, recipes, and educational content
- Searchable database

#### 📚 Cheezopedia
- Detailed entries on cheese varieties
- Origin information and historical context
- Pairing suggestions
- Visual guides and tasting notes

#### 👤 Profile
- User preferences
- Activity history
- Social connections
- Achievement badges

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS version)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on mobile device (for testing)

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start` or `npx expo start`
4. Use Expo Go app to scan the QR code or run on emulator/simulator

### Environment Setup
The app requires connection to Supabase. Create a `.env` file with your Supabase credentials (see `.env.example`).

## 📱 Available Scripts
- `npm start`: Start the Expo development server
- `npm run android`: Run on Android device/emulator
- `npm run ios`: Run on iOS simulator (macOS only)
- `npm run web`: Run in web browser

## 📊 Database Schema
The app uses Supabase with the following main tables:
- `cheeses`: Cheese catalog with detailed information
- `user_cheese_box`: User's saved cheeses with personal notes
- `articles`: Educational content and blog posts
- `recipes`: Cheese-related recipes
- `pairings`: Wine, beer, and food pairing suggestions

## 🤝 Contributing
We welcome contributions! Please see our contributing guide for more information.

## 📄 License
All rights reserved.
