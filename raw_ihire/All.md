# Infinwork (iHire) - All Features & Ideas to Date

This document outlines all the core features, modules, and ideas built into the Infinwork (formerly iHire) platform to date.

## 1. iChain (Collaborative Productivity)
- **Concept**: A multiplayer productivity tracker. Users form "chains" with their friends, colleagues, or peers.
- **Mechanics**:
  - **Active State**: The chain progresses as long as *at least one* member is actively working.
  - **Idle State**: If no one is working, the chain enters an Idle state. 
  - **Burst State**: If the chain remains idle for too long, it "bursts," breaking the streak.
  - **Ranking**: Chains are ranked on the global dashboard based on `maxTime` (the longest unbroken amount of time accumulated before bursting).
  - **Members & Invites**: Members can join via email/username search, and a shareable link allows users to easily invite others. WhatsApp integration (links) is also supported for group coordination.

## 2. GitHub Integration & Gamification
- **GitHub Sync**: Users can connect their GitHub accounts directly to the platform (`/api/user/sync-github`).
- **Commits to Points**: The system tracks and fetches the user's total GitHub commits and dynamically rewards them with "points."
- **Leaderboards/Gamification**: Points encourage developers to maintain their open-source and coding consistency. Sync locks prevent API abuse.

## 3. Hiring & Worker Management (The "iHire" Core)
- **Candidates & Campaigns**: A full suite for managing job candidates, tracking their progress, and organizing them into hiring campaigns.
- **Workers Directory**: Tracking active workers and their status (`/app/workers`).
- **Send-Assignment Module**: Automated workflows to send technical tests and assignments to candidates.
- **SF-Tracker**: A specialized tracker (likely for Salesforce or specific funnel tracking) to monitor candidate progression.

## 4. UI/UX & Design System
- **Dark/Light Mode**: A custom, meticulously mapped theming system. The platform natively uses a "Liquid Glass" dark mode aesthetic (`liquid-glass-button`) but dynamically adapts to a clean, formal Light Mode by mapping deep zinc colors to light grays and whites.
- **Responsive Animations**: Framer Motion is utilized heavily across dashboards and Chain Cards for micro-interactions (e.g., subtle shakes on "Burst" chains).
- **Search & Auto-complete**: Fast, case-insensitive partial user searches via the database for seamless team building.

## 5. Architecture & Tech Stack
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Framer Motion.
- **Backend**: Next.js API Routes (Serverless), MongoDB (Mongoose).
- **Authentication**: NextAuth.js.
- **Data Models**: Distinct models for `User` (tracking github stats & points), `IChain` (tracking team time), and `ITimeTask` (tracking individual productivity).
