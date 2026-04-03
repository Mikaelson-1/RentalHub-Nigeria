# Getting Started

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [schema.prisma](file://prisma/schema.prisma)
- [seed.ts](file://prisma/seed.ts)
- [prisma.ts](file://src/lib/prisma.ts)
- [auth.ts](file://src/lib/auth.ts)
- [route.ts](file://src/app/api/auth/[...nextauth]/route.ts)
- [middleware.ts](file://src/middleware.ts)
- [Providers.tsx](file://src/components/Providers.tsx)
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/(auth)/login/page.tsx)
- [page.tsx](file://src/app/(dashboards)/admin/page.tsx)
- [next.config.mjs](file://next.config.mjs)
- [tailwind.config.ts](file://tailwind.config.ts)
- [tsconfig.json](file://tsconfig.json)
</cite>

## Update Summary
**Changes Made**
- Updated Prisma ORM configuration and database schema documentation
- Enhanced TypeScript integration details and configuration
- Added comprehensive authentication system documentation
- Expanded middleware and role-based access control coverage
- Updated Next.js App Router structure and routing patterns
- Enhanced development environment setup with modern tooling

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Setup](#environment-setup)
5. [Database Configuration and Seeding](#database-configuration-and-seeding)
6. [Running the Development Server](#running-the-development-server)
7. [Project Structure](#project-structure)
8. [Key Configuration Files](#key-configuration-files)
9. [Essential Commands](#essential-commands)
10. [Architecture Overview](#architecture-overview)
11. [Detailed Component Analysis](#detailed-component-analysis)
12. [Dependency Analysis](#dependency-analysis)
13. [Performance Considerations](#performance-considerations)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Verification Steps](#verification-steps)
16. [Conclusion](#conclusion)

## Introduction
RentalHub-BOUESTI is a modern Next.js 15 application built with TypeScript that connects students and landlords for off-campus accommodation near Bamidele Olumilua University of Education, Science and Technology (BOUESTI) in Ikere-Ekiti. The platform leverages cutting-edge technologies including Prisma ORM for database management, NextAuth.js for authentication, and comprehensive TypeScript support for type safety and developer experience.

## Prerequisites
- **Node.js 18+** (compatible with Next.js 15)
- **PostgreSQL database** (version 12+ recommended)
- **Git** (for repository cloning)
- **TypeScript knowledge** (for development)
- **Prisma CLI** (for database operations)

**Section sources**
- [package.json:20-31](file://package.json#L20-L31)
- [schema.prisma:10-13](file://prisma/schema.prisma#L10-L13)

## Installation
Follow these steps to set up the project locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/mikaelson/RentalHub-BOUESTI.git
   cd RentalHub-BOUESTI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see Environment Setup section)

4. **Configure and seed the database** (see Database Configuration and Seeding section)

5. **Start the development server**
   ```bash
   npm run dev
   ```

**Section sources**
- [package.json:5-16](file://package.json#L5-L16)

## Environment Setup
Create a `.env.local` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/rentalhub_bouesti?schema=public"

# Authentication Configuration
NEXTAUTH_SECRET="your-32-character-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Prisma Configuration
PRISMA_CLIENT_ENGINE_TYPE=bundled
```

**Important Notes:**
- **DATABASE_URL**: Must point to a PostgreSQL database with proper credentials
- **NEXTAUTH_SECRET**: Cryptographically secure 32-character random string
- **NEXT_PUBLIC_APP_URL**: Should match your deployment URL for production
- **PRISMA_CLIENT_ENGINE_TYPE**: Set to `bundled` for development

**Section sources**
- [schema.prisma:12](file://prisma/schema.prisma#L12)
- [auth.ts:36-45](file://src/lib/auth.ts#L36-L45)

## Database Configuration and Seeding
Configure the database using Prisma with the following workflow:

1. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

2. **Push schema to database**
   ```bash
   npm run db:push
   ```

3. **Create database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Seed initial data**
   ```bash
   npm run db:seed
   ```

```mermaid
flowchart TD
Start(["Start"]) --> Generate["Generate Prisma client"]
Generate --> Push["Push schema to database"]
Push --> Migrate["Create migrations"]
Migrate --> Seed["Seed initial data"]
Seed --> Verify["Verify data integrity"]
Verify --> End(["Complete"])
```

**Diagram sources**
- [package.json:11-15](file://package.json#L11-L15)
- [seed.ts:126-133](file://prisma/seed.ts#L126-L133)

**Section sources**
- [package.json:11-15](file://package.json#L11-L15)
- [schema.prisma:10-13](file://prisma/schema.prisma#L10-L13)
- [seed.ts:1-10](file://prisma/seed.ts#L1-L10)

## Running the Development Server
Start the development server with hot reloading and TypeScript support:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` by default. The development server includes:

- **Hot Module Replacement** for instant UI updates
- **TypeScript compilation** with strict type checking
- **Prisma client generation** on demand
- **Next.js App Router** with dynamic imports

**Section sources**
- [package.json:6](file://package.json#L6)

## Project Structure
The project follows Next.js App Router conventions with a modern TypeScript architecture:

```mermaid
graph TB
Root["Project Root"]
Prisma["prisma/"]
Src["src/"]
App["app/"]
Lib["lib/"]
Components["components/"]
Types["types/"]
Middleware["middleware.ts"]
Tests["tests/"]
Root --> Prisma
Root --> Src
Src --> App
Src --> Lib
Src --> Components
Src --> Types
Src --> Middleware
Src --> Tests
Prisma --> Schema["schema.prisma"]
Prisma --> Seed["seed.ts"]
Lib --> PrismaTS["prisma.ts"]
Lib --> AuthTS["auth.ts"]
App --> Auth["(auth)/"]
App --> Dashboards["(dashboards)/"]
App --> Public["(public)/"]
App --> API["api/"]
Components --> Providers["Providers.tsx"]
```

**Diagram sources**
- [package.json](file://package.json)
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [prisma/seed.ts](file://prisma/seed.ts)
- [src/lib/prisma.ts](file://src/lib/prisma.ts)
- [src/lib/auth.ts](file://src/lib/auth.ts)
- [src/middleware.ts](file://src/middleware.ts)
- [src/components/Providers.tsx](file://src/components/Providers.tsx)

**Section sources**
- [package.json](file://package.json)

## Key Configuration Files
Important configuration files and their purposes:

### Core Configuration
- **`next.config.mjs`** — Next.js configuration with custom distDir and image optimization
- **`tailwind.config.ts`** — Tailwind CSS customization for branding and responsive design
- **`tsconfig.json`** — TypeScript compiler options with path aliases and strict mode

### Database Configuration
- **`prisma/schema.prisma`** — Database schema definition with enums, models, and relations
- **`prisma/seed.ts`** — Initial data seeding script for locations and admin user

### Authentication Configuration
- **`src/lib/prisma.ts`** — Prisma client singleton with development caching
- **`src/lib/auth.ts`** — NextAuth.js configuration with JWT strategy and custom callbacks

**Section sources**
- [next.config.mjs:1-16](file://next.config.mjs#L1-L16)
- [tailwind.config.ts:1-35](file://tailwind.config.ts#L1-L35)
- [tsconfig.json:1-42](file://tsconfig.json#L1-L42)
- [prisma/schema.prisma:1-136](file://prisma/schema.prisma#L1-L136)
- [prisma/seed.ts:1-143](file://prisma/seed.ts#L1-L143)

## Essential Commands
Comprehensive command list for development and maintenance:

### Development Commands
- `npm run dev` — Start development server with hot reloading
- `npm run build` — Create production build with optimization
- `npm run start` — Start production server
- `npm run lint` — Run ESLint with Next.js configuration

### Database Commands
- `npm run db:generate` — Generate Prisma client from schema
- `npm run db:push` — Push schema to database (development only)
- `npm run db:migrate` — Create database migrations
- `npm run db:seed` — Seed database with initial data
- `npm run db:studio` — Launch Prisma Studio for database inspection

### Testing Commands
- `npm run test` — Run JavaScript tests with Node.js test runner

**Section sources**
- [package.json:5-16](file://package.json#L5-L16)

## Architecture Overview
The application uses a modern layered architecture with clear separation of concerns:

```mermaid
graph TB
subgraph "Presentation Layer"
Layout["Root Layout"]
Providers["Session Providers"]
AuthPages["Authentication Pages"]
DashboardPages["Role-based Dashboards"]
PublicPages["Public Pages"]
end
subgraph "Application Layer"
Auth["NextAuth.js"]
Middleware["Route Protection"]
API["API Routes"]
Actions["Server Actions"]
end
subgraph "Data Layer"
Prisma["Prisma Client"]
DB["PostgreSQL"]
Cache["Redis Cache"]
end
subgraph "Infrastructure"
Next["Next.js Runtime"]
Config["Configuration Files"]
Build["Build Tools"]
end
Layout --> Providers
Providers --> AuthPages
Auth --> Middleware
Middleware --> DashboardPages
API --> Prisma
Actions --> Prisma
Prisma --> DB
Auth --> Cache
Config --> Next
Build --> Next
```

**Diagram sources**
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- [src/lib/auth.ts:36-118](file://src/lib/auth.ts#L36-L118)
- [src/middleware.ts:15-75](file://src/middleware.ts#L15-L75)
- [prisma/schema.prisma:44-135](file://prisma/schema.prisma#L44-L135)

## Detailed Component Analysis

### Authentication System
The authentication system uses NextAuth.js with credentials provider and JWT sessions:

```mermaid
sequenceDiagram
participant Client as "Client Browser"
participant AuthRoute as "Auth API Route"
participant AuthConfig as "Auth Configuration"
participant Prisma as "Prisma Client"
participant DB as "PostgreSQL"
Client->>AuthRoute : POST credentials
AuthRoute->>AuthConfig : authorize(credentials)
AuthConfig->>Prisma : findUnique(email)
Prisma->>DB : SELECT user
DB-->>Prisma : User record
Prisma-->>AuthConfig : User object
AuthConfig->>AuthConfig : bcrypt compare
AuthConfig->>AuthConfig : verify status
AuthConfig-->>AuthRoute : Authorized user
AuthRoute-->>Client : JWT session
```

**Diagram sources**
- [src/app/api/auth/[...nextauth]/route.ts:1-7](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/lib/auth.ts:53-92](file://src/lib/auth.ts#L53-L92)
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)

**Section sources**
- [src/lib/auth.ts:1-119](file://src/lib/auth.ts#L1-L119)
- [src/app/api/auth/[...nextauth]/route.ts:1-7](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)

### Database Schema
The database schema defines four core models with comprehensive relationships:

```mermaid
erDiagram
USER {
string id PK
string name
string email UK
string password
enum role
enum verificationStatus
datetime createdAt
datetime updatedAt
}
LOCATION {
string id PK
string name UK
string classification
datetime createdAt
datetime updatedAt
}
PROPERTY {
string id PK
string title
text description
decimal price
decimal distanceToCampus
json amenities
json images
enum status
datetime createdAt
datetime updatedAt
string landlordId FK
string locationId FK
}
BOOKING {
string id PK
enum status
datetime createdAt
datetime updatedAt
string studentId FK
string propertyId FK
}
USER ||--o{ PROPERTY : "landlordId"
USER ||--o{ BOOKING : "studentId"
LOCATION ||--o{ PROPERTY : "locationId"
PROPERTY ||--o{ BOOKING : "propertyId"
```

**Diagram sources**
- [prisma/schema.prisma:44-135](file://prisma/schema.prisma#L44-L135)

**Section sources**
- [prisma/schema.prisma:15-135](file://prisma/schema.prisma#L15-L135)

### Role-Based Access Control
The middleware enforces sophisticated role-based access to protected routes:

```mermaid
flowchart TD
Request["Incoming Request"] --> GetToken["Extract JWT Token"]
GetToken --> CheckAuth{"Authenticated?"}
CheckAuth --> |No| RedirectLogin["Redirect to /login"]
CheckAuth --> |Yes| CheckPath{"Route Path"}
CheckPath --> |/student| CheckStudent{"Role == STUDENT?"}
CheckPath --> |/landlord| CheckLandlord{"Role in [LANDLORD, ADMIN]?"}
CheckPath --> |/admin| CheckAdmin{"Role == ADMIN?"}
CheckPath --> |Other| AllowAccess["Allow Access"]
CheckStudent --> |No| RedirectRole["Redirect to user dashboard"]
CheckLandlord --> |No| RedirectRole
CheckAdmin --> |No| RedirectRole
RedirectLogin --> End["End"]
RedirectRole --> End
AllowAccess --> End
```

**Diagram sources**
- [src/middleware.ts:15-75](file://src/middleware.ts#L15-L75)

**Section sources**
- [src/middleware.ts:15-75](file://src/middleware.ts#L15-L75)

## Dependency Analysis
The project has a comprehensive dependency tree with modern web development tools:

```mermaid
graph TB
subgraph "Runtime Dependencies"
Next["next@15.2.4"]
NextAuth["next-auth@4.24.13"]
PrismaClient["@prisma/client@5.22.0"]
React["react@19.2.4"]
ReactDOM["react-dom@19.2.4"]
Bcrypt["bcryptjs@2.4.3"]
Lucide["lucide-react@1.7.0"]
Zod["zod@4.3.6"]
HookForm["react-hook-form@7.72.0"]
Resolver["@hookform/resolvers@5.2.2"]
PrismaAdapter["@auth/prisma-adapter@2.11.1"]
end
subgraph "Development Dependencies"
PrismaDev["prisma@5.22.0"]
TSNode["ts-node@10.9.2"]
Tailwind["tailwindcss@3.4.19"]
ESLint["eslint@9"]
TypeScript["typescript@5"]
PostCSS["postcss@8.5.8"]
Autoprefixer["@tailwindcss/postcss@4.2.2"]
ESLintNext["eslint-config-next@15.2.4"]
end
subgraph "Configuration"
PostCSSConfig["postcss.config.mjs"]
TailwindConfig["tailwind.config.ts"]
NextConfig["next.config.mjs"]
TSConfig["tsconfig.json"]
ESLintConfig[".eslintrc.json"]
end
Next --> NextAuth
Next --> React
Next --> ReactDOM
NextAuth --> PrismaClient
NextAuth --> PrismaAdapter
PrismaClient --> PrismaDev
PrismaDev --> TSNode
Tailwind --> PostCSS
Tailwind --> Autoprefixer
TailwindConfig --> Tailwind
NextConfig --> Next
TSConfig --> TypeScript
ESLintConfig --> ESLint
```

**Diagram sources**
- [package.json:20-47](file://package.json#L20-L47)

**Section sources**
- [package.json:20-47](file://package.json#L20-L47)

## Performance Considerations
The application implements several performance optimizations:

### Database Performance
- **Prisma client singleton** prevents connection pool exhaustion during hot reload
- **Development logging** includes query, error, and warning logs for debugging
- **Production logging** minimized to reduce overhead

### Application Performance
- **Next.js App Router** with dynamic imports for optimal bundle splitting
- **Image optimization** configured for external image patterns
- **TypeScript strict mode** for compile-time error detection
- **Path aliases** (`@/*`) for efficient module resolution

### Security Performance
- **JWT session strategy** with 30-day expiration
- **Password hashing** with bcryptjs for secure authentication
- **Role-based access control** at middleware level

**Section sources**
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- [next.config.mjs:3-12](file://next.config.mjs#L3-L12)
- [auth.ts:38-41](file://src/lib/auth.ts#L38-L41)

## Troubleshooting Guide
Common setup issues and their solutions:

### Database Connection Issues
- **Verify DATABASE_URL format**: Ensure proper PostgreSQL connection string
- **Check PostgreSQL server**: Confirm server is running and accessible
- **Validate credentials**: Verify username, password, and database permissions
- **Network connectivity**: Test connection from localhost

### Authentication Problems
- **NEXTAUTH_SECRET validation**: Ensure 32-character cryptographically secure secret
- **JWT token expiration**: Check session duration settings
- **Email/password validation**: Verify credentials in seed data
- **Token extraction**: Confirm `NEXTAUTH_SECRET` environment variable

### Prisma Migration Failures
- **Client regeneration**: Run `npm run db:generate` to regenerate Prisma client
- **Schema validation**: Use `npm run db:push` for development schema updates
- **Migration creation**: Run `npm run db:migrate` for production migrations
- **Seed execution**: Verify `npm run db:seed` completes successfully

### Build and Development Issues
- **TypeScript errors**: Check `tsconfig.json` for strict mode conflicts
- **Module resolution**: Verify path aliases in `tsconfig.json`
- **Node.js version**: Ensure Node.js 18+ compatibility
- **Memory issues**: Clear `node_modules` and reinstall dependencies

### Environment Configuration
- **Missing environment variables**: Create `.env.local` with required variables
- **Path configuration**: Ensure `@/*` path alias points to `./src/*`
- **PostCSS configuration**: Verify Tailwind CSS setup
- **ESLint configuration**: Check Next.js ESLint preset compatibility

**Section sources**
- [schema.prisma:12](file://prisma/schema.prisma#L12)
- [auth.ts:36-45](file://src/lib/auth.ts#L36-L45)
- [package.json:11-15](file://package.json#L11-L15)

## Verification Steps
After installation, verify the setup comprehensively:

### Database Connectivity Test
1. **Connect to PostgreSQL** using DATABASE_URL
2. **Verify schema synchronization** with prisma/schema.prisma
3. **Check table creation** for users, locations, properties, bookings
4. **Validate indexes** on email, role, locationId, status fields

### Application Startup Verification
1. **Access development server** at `http://localhost:3000`
2. **Verify homepage rendering** without errors
3. **Check asset loading** (CSS, fonts, images)
4. **Test hot reload** functionality

### Authentication Validation
1. **Login with admin credentials**: `admin@bouesti.edu.ng` / `Admin@BOUESTI2025!`
2. **Verify role-based access** to `/admin` dashboard
3. **Test session persistence** across page refreshes
4. **Validate JWT token** in browser storage

### API Endpoint Testing
1. **Test property listing** endpoint `/api/properties`
2. **Verify booking creation** flow
3. **Check admin summary** endpoint `/api/admin/summary`
4. **Test authentication** endpoints `/api/auth/[...nextauth]`

### Database Seeding Confirmation
1. **Verify location seeding** for Ikere-Ekiti areas
2. **Check admin user existence** with VERIFIED status
3. **Validate bcrypt hashing** of passwords
4. **Confirm enum values** for roles and statuses

**Section sources**
- [seed.ts:71-122](file://prisma/seed.ts#L71-L122)
- [src/app/(auth)/login/page.tsx:1-206](file://src/app/(auth)/login/page.tsx#L1-L206)
- [src/app/(dashboards)/admin/page.tsx:1-247](file://src/app/(dashboards)/admin/page.tsx#L1-L247)

## Conclusion
RentalHub-BOUESTI represents a comprehensive, production-ready solution for managing off-campus accommodation with modern web development practices. The complete Next.js application setup includes:

- **TypeScript integration** for type safety and developer experience
- **Prisma ORM** for database abstraction and schema management
- **NextAuth.js** for secure authentication and session management
- **Role-based access control** with middleware protection
- **Modern development tooling** with ESLint, Tailwind CSS, and PostCSS
- **Comprehensive testing** framework with Node.js test runner

The setup process establishes a robust development environment with proper authentication, database configuration, and development tooling, providing a solid foundation for future feature development and scalability.