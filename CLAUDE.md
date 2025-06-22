# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI image processing web application built with React, TypeScript, and Vite. The application provides batch image processing capabilities including background removal, image expansion (outpainting), upscaling, and one-click AI enhancement workflows. It integrates with GPT-4o and Alibaba's Tongyi Qianwen (Qwen) APIs for image processing.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Key Architecture Components

### Application Structure
- **React Router**: Main navigation between `/` (Workspace), `/gallery`, and `/settings`
- **Sidebar Layout**: Uses shadcn/ui sidebar components for consistent navigation
- **State Management**: React Query for server state, local state with hooks
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS

### Core Features
1. **Workspace** (`/src/pages/Workspace.tsx`): Main processing interface with 4 tabs:
   - One-click workflow (扩图 + 高清化)
   - Background replacement (背景替换)  
   - Image expansion (扩图)
   - Image upscaling (高清化)

2. **Gallery** (`/src/pages/Gallery.tsx`): Results viewing and management
3. **Settings** (`/src/pages/Settings.tsx`): API configuration

### API Integration
- **APIService** (`/src/services/apiService.ts`): Handles integration with:
  - GPT-4o for background replacement and image generation
  - Qwen (Tongyi Qianwen) for outpainting and upscaling
- **Configuration**: API keys stored in localStorage, managed via Settings page
- **Async Processing**: Uses async task submission and polling for long-running operations

### Processing Architecture
- **Types** (`/src/types/processing.ts`): Defines processing task and batch group interfaces
- **Queue System**: Tracks processing status with `queued`, `processing`, `completed`, `error` states
- **Batch Processing**: Groups multiple images for efficient processing

### Component Organization
- **Processing Panels**: `OneClickWorkflowPanel`, `BackgroundRemovalPanel`, `ImageExpansionPanel`, `ImageUpscalingPanel`
- **Upload Components**: `BatchImageUploader`, `ReferenceImageUploader`
- **Gallery Components**: `ImageGrid`, `FolderGrid`, `ImageCard`, `FolderCard`
- **UI Components**: Located in `/src/components/ui/` following shadcn/ui patterns

### Hooks
- **useAPIService**: Manages API service configuration and initialization
- **useGallery**: Handles gallery state, search, selection, and view modes
- **use-mobile**: Responsive design utilities

## Technical Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Radix UI, Tailwind CSS
- **State**: React Query, React Hook Form with Zod validation
- **Routing**: React Router DOM
- **Build**: Vite with SWC React plugin
- **Package Manager**: npm (has both npm and bun lockfiles)

## Development Notes
- **Alias Configuration**: `@/` maps to `/src/` directory
- **Hot Reload**: Development server runs on `::` (all interfaces) port 8080
- **Component Tagging**: Uses `lovable-tagger` in development mode
- **Chinese UI**: Interface is primarily in Chinese for Chinese users
- **File Upload**: Uses react-dropzone for drag-and-drop functionality

## API Configuration Requirements
The application requires API keys for:
1. **GPT API**: For background replacement functionality
2. **Qwen API**: For image outpainting and upscaling
3. **Temp File Server** (optional): For file hosting if not using base64

API settings are managed through the Settings page and persisted in localStorage.