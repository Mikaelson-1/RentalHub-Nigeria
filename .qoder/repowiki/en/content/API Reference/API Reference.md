# API Reference

<cite>
**Referenced Files in This Document**
- [src/app/api/auth/register/route.ts](file://src/app/api/auth/register/route.ts)
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts)
- [src/app/api/bookings/route.ts](file://src/app/api/bookings/route.ts)
- [src/app/api/locations/route.ts](file://src/app/api/locations/route.ts)
- [src/app/api/properties/route.ts](file://src/app/api/properties/route.ts)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts)
- [src/app/api/uploads/route.ts](file://src/app/api/uploads/route.ts)
- [src/lib/auth.ts](file://src/lib/auth.ts)
- [src/middleware.ts](file://src/middleware.ts)
- [src/lib/prisma.ts](file://src/lib/prisma.ts)
- [src/lib/schools.ts](file://src/lib/schools.ts)
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [src/app/login/page.tsx](file://src/app/login/page.tsx)
- [src/app/register/page.tsx](file://src/app/register/page.tsx)
- [package.json](file://package.json)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive coverage of the Uploads API for file management
- Enhanced Property Management API documentation with new filtering capabilities
- Expanded Booking System API documentation with PATCH endpoint for status updates
- Updated authentication flow documentation with improved error handling
- Added detailed data model documentation with all entity relationships
- Enhanced security and middleware documentation
- Updated performance considerations with new pagination and filtering features

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides a comprehensive API reference for the RentalHub-BOUESTI platform. It covers authentication endpoints (registration, login, logout), property management endpoints (listing, creation, status updates), booking system endpoints (requests, approvals, cancellations), location services endpoints, and file upload capabilities. For each endpoint, you will find HTTP methods, URL patterns, request/response schemas, authentication requirements, parameter validation, response codes, and practical usage examples. It also documents API versioning, rate limiting considerations, and integration patterns with the frontend.

## Project Structure
RentalHub-BOUESTI is a Next.js application using NextAuth.js for authentication and Prisma for data access. API routes are located under src/app/api and are grouped by feature. Authentication is handled via NextAuth.js with a Credentials provider backed by Prisma and bcrypt. Middleware enforces role-based access to protected routes.

```mermaid
graph TB
subgraph "Frontend"
FE_Login["Login Page<br/>src/app/login/page.tsx"]
FE_Register["Register Page<br/>src/app/register/page.tsx"]
end
subgraph "Next.js App Router"
API_Auth_NextAuth["/api/auth/[...nextauth]<br/>src/app/api/auth/[...nextauth]/route.ts"]
API_Auth_Register["/api/auth/register<br/>src/app/api/auth/register/route.ts"]
API_Properties["/api/properties<br/>src/app/api/properties/route.ts"]
API_Properties_Status["/api/properties/[id]/status<br/>src/app/api/properties/[id]/status/route.ts"]
API_Locations["/api/locations<br/>src/app/api/locations/route.ts"]
API_Bookings["/api/bookings<br/>src/app/api/bookings/route.ts"]
API_Uploads["/api/uploads<br/>src/app/api/uploads/route.ts"]
end
subgraph "Auth & Security"
NextAuth_Config["NextAuth Config<br/>src/lib/auth.ts"]
Middleware["Edge Middleware<br/>src/middleware.ts"]
end
subgraph "Data Layer"
Prisma_Client["Prisma Client<br/>src/lib/prisma.ts"]
DB_Schema["Prisma Schema<br/>prisma/schema.prisma"]
Schools_Data["Schools Utility<br/>src/lib/schools.ts"]
end
FE_Login --> API_Auth_NextAuth
FE_Register --> API_Auth_Register
API_Auth_NextAuth --> NextAuth_Config
API_Auth_Register --> Prisma_Client
API_Properties --> Prisma_Client
API_Properties_Status --> Prisma_Client
API_Locations --> Prisma_Client
API_Bookings --> Prisma_Client
API_Uploads --> Prisma_Client
NextAuth_Config --> Prisma_Client
Middleware --> NextAuth_Config
Prisma_Client --> DB_Schema
Prisma_Client --> Schools_Data
```

**Diagram sources**
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/app/api/auth/register/route.ts:1-90](file://src/app/api/auth/register/route.ts#L1-L90)
- [src/app/api/properties/route.ts:1-162](file://src/app/api/properties/route.ts#L1-L162)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L1-L69)
- [src/app/api/locations/route.ts:1-29](file://src/app/api/locations/route.ts#L1-L29)
- [src/app/api/bookings/route.ts:1-182](file://src/app/api/bookings/route.ts#L1-L182)
- [src/app/api/uploads/route.ts:1-82](file://src/app/api/uploads/route.ts#L1-L82)
- [src/lib/auth.ts:1-119](file://src/lib/auth.ts#L1-L119)
- [src/middleware.ts:1-76](file://src/middleware.ts#L1-L76)
- [src/lib/prisma.ts:1-27](file://src/lib/prisma.ts#L1-L27)
- [src/lib/schools.ts:1-31](file://src/lib/schools.ts#L1-L31)
- [prisma/schema.prisma:1-136](file://prisma/schema.prisma#L1-L136)

**Section sources**
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/app/api/auth/register/route.ts:1-90](file://src/app/api/auth/register/route.ts#L1-L90)
- [src/app/api/properties/route.ts:1-162](file://src/app/api/properties/route.ts#L1-L162)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L1-L69)
- [src/app/api/locations/route.ts:1-29](file://src/app/api/locations/route.ts#L1-L29)
- [src/app/api/bookings/route.ts:1-182](file://src/app/api/bookings/route.ts#L1-L182)
- [src/app/api/uploads/route.ts:1-82](file://src/app/api/uploads/route.ts#L1-L82)
- [src/lib/auth.ts:1-119](file://src/lib/auth.ts#L1-L119)
- [src/middleware.ts:1-76](file://src/middleware.ts#L1-L76)
- [src/lib/prisma.ts:1-27](file://src/lib/prisma.ts#L1-L27)
- [src/lib/schools.ts:1-31](file://src/lib/schools.ts#L1-L31)
- [prisma/schema.prisma:1-136](file://prisma/schema.prisma#L1-L136)

## Core Components
- Authentication service: NextAuth.js with Credentials provider, JWT session strategy, and role-based callbacks.
- Data access: Prisma client singleton with PostgreSQL database.
- Middleware: Edge middleware enforcing role-based access to protected routes.
- API routes: Feature-based Next.js App Router handlers for auth, properties, locations, bookings, and uploads.

Key implementation references:
- NextAuth configuration and JWT/session callbacks: [src/lib/auth.ts:36-118](file://src/lib/auth.ts#L36-L118)
- Prisma client singleton: [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- Protected routes middleware: [src/middleware.ts:15-66](file://src/middleware.ts#L15-L66)

**Section sources**
- [src/lib/auth.ts:36-118](file://src/lib/auth.ts#L36-L118)
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- [src/middleware.ts:15-66](file://src/middleware.ts#L15-L66)

## Architecture Overview
The API follows a layered architecture:
- Presentation: Next.js App Router API routes.
- Application: Route handlers implement business logic and orchestrate Prisma queries.
- Persistence: Prisma ORM with PostgreSQL.
- Security: NextAuth.js handles authentication and authorization via JWT tokens.

```mermaid
sequenceDiagram
participant Client as "Client"
participant LoginUI as "Login Page<br/>src/app/login/page.tsx"
participant NextAuth as "NextAuth Handler<br/>src/app/api/auth/[...nextauth]/route.ts"
participant AuthCfg as "Auth Config<br/>src/lib/auth.ts"
participant Prisma as "Prisma Client<br/>src/lib/prisma.ts"
Client->>LoginUI : "Submit credentials"
LoginUI->>NextAuth : "POST /api/auth/callback/credentials"
NextAuth->>AuthCfg : "authorize(credentials)"
AuthCfg->>Prisma : "findUnique(User)"
Prisma-->>AuthCfg : "User record"
AuthCfg->>AuthCfg : "compare password"
AuthCfg-->>NextAuth : "User payload (JWT)"
NextAuth-->>Client : "Set session cookie (JWT)"
```

**Diagram sources**
- [src/app/login/page.tsx:51-51](file://src/app/login/page.tsx#L51-L51)
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/lib/auth.ts:53-92](file://src/lib/auth.ts#L53-L92)
- [src/lib/prisma.ts:1-27](file://src/lib/prisma.ts#L1-L27)

**Section sources**
- [src/app/login/page.tsx:51-51](file://src/app/login/page.tsx#L51-L51)
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/lib/auth.ts:53-92](file://src/lib/auth.ts#L53-L92)
- [src/lib/prisma.ts:1-27](file://src/lib/prisma.ts#L1-L27)

## Detailed Component Analysis

### Authentication API

#### Registration
- Method: POST
- URL: /api/auth/register
- Purpose: Register a new user (STUDENT or LANDLORD). Admins are created via seed or direct DB access.
- Authentication: Not required.
- Request body schema:
  - name: string (required)
  - email: string (required)
  - password: string (required, minimum 8 characters)
  - role: enum STUDENT | LANDLORD (optional, defaults to STUDENT)
- Response schema:
  - success: boolean
  - data: user profile (id, name, email, role, verificationStatus, createdAt)
  - message: string
- Status codes:
  - 201 Created: Registration successful.
  - 400 Bad Request: Missing or invalid fields.
  - 409 Conflict: Email already registered.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - POST /api/auth/register with JSON body containing name, email, password, and role.
  - Response includes success flag and user data.

Validation highlights:
- Validates presence of name, email, password.
- Enforces role selection from STUDENT or LANDLORD.
- Password length minimum 8 characters.
- Checks uniqueness of email.
- Hashes password before persisting.

**Section sources**
- [src/app/api/auth/register/route.ts:20-89](file://src/app/api/auth/register/route.ts#L20-L89)

#### Login
- Method: POST
- URL: /api/auth/callback/credentials
- Purpose: Authenticate user credentials and establish a session.
- Authentication: Not required.
- Request body schema:
  - email: string (required)
  - password: string (required)
- Response: Redirects to dashboard or login with error on failure.
- Status codes:
  - 302 Found: Successful login redirects to dashboard.
  - 401 Unauthorized: Invalid credentials or suspended account.
- Practical example:
  - Submit form to /api/auth/callback/credentials with email and password.
  - On success, NextAuth sets a session cookie.

Integration note:
- The login page posts directly to the NextAuth callback endpoint.

**Section sources**
- [src/app/login/page.tsx:51-51](file://src/app/login/page.tsx#L51-L51)
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/lib/auth.ts:53-92](file://src/lib/auth.ts#L53-L92)

#### Logout
- Method: POST
- URL: /api/auth/signout
- Purpose: Terminate current session.
- Authentication: Not required.
- Response: Redirects to login page.
- Status codes:
  - 302 Found: Redirect to login.
- Practical example:
  - POST to /api/auth/signout to clear session.

**Section sources**
- [src/app/api/auth/[...nextauth]/route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L1-L7)
- [src/lib/auth.ts:114-118](file://src/lib/auth.ts#L114-L118)

### Property Management API

#### List/Search Properties
- Method: GET
- URL: /api/properties
- Purpose: Retrieve paginated, filtered, and sorted property listings.
- Authentication: Not required (public).
- Query parameters:
  - location: string (optional)
  - school: string (optional, filters by university proximity)
  - status: enum PENDING | APPROVED | REJECTED (optional, defaults to APPROVED)
  - minPrice: number (optional)
  - maxPrice: number (optional)
  - page: number (optional, default 1)
  - pageSize: number (optional, default 12, max 50)
  - sortBy: enum price | createdAt | distanceToCampus (optional, default createdAt)
  - sortOrder: enum asc | desc (optional, default desc)
  - mine: boolean (optional, when true, filters by current user's properties for landlords)
- Response schema:
  - success: boolean
  - data.items: array of properties with landlord, reviewer, and location details
  - data.total: number
  - data.page: number
  - data.pageSize: number
  - data.totalPages: number
- Status codes:
  - 200 OK: Properties fetched successfully.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - GET /api/properties?page=1&pageSize=12&status=APPROVED&sortBy=price&sortOrder=asc

Enhanced filtering capabilities:
- Supports university proximity filtering using predefined keywords
- Landlord-specific filtering with the mine parameter
- Comprehensive property status filtering for different user roles

**Section sources**
- [src/app/api/properties/route.ts:15-93](file://src/app/api/properties/route.ts#L15-L93)

#### Create Property Listing
- Method: POST
- URL: /api/properties
- Purpose: Landlords submit a property for review.
- Authentication: Required (LANDLORD or ADMIN).
- Request body schema:
  - title: string (required)
  - description: string (required)
  - price: number (required)
  - locationId: string (required)
  - distanceToCampus: number (optional)
  - amenities: string[] (optional, JSON array)
  - images: string[] (optional, JSON array)
- Response schema:
  - success: boolean
  - data: property (with location included)
  - message: string
- Status codes:
  - 201 Created: Property submitted for review.
  - 400 Bad Request: Missing required fields or invalid location.
  - 401 Unauthorized: Authentication required.
  - 403 Forbidden: Only landlords can list properties.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - POST /api/properties with JSON body including title, description, price, locationId, and optional amenities/images.

Validation highlights:
- Requires STUDENT/LANDLORD roles for listing.
- Validates presence of required fields.
- Ensures location exists.
- Requires at least one image for property submission.

**Section sources**
- [src/app/api/properties/route.ts:97-161](file://src/app/api/properties/route.ts#L97-L161)

#### Update Property Status (Admin)
- Method: PATCH
- URL: /api/properties/[id]/status
- Purpose: Approve or reject a property listing.
- Authentication: Required (ADMIN).
- Path parameters:
  - id: string (property identifier)
- Request body schema:
  - status: enum PENDING | APPROVED | REJECTED (required)
  - reason: string (required when rejecting)
- Response schema:
  - success: boolean
  - data: property (with landlord and location included)
  - message: string
- Status codes:
  - 200 OK: Status updated successfully.
  - 400 Bad Request: Invalid status value or missing rejection reason.
  - 401 Unauthorized: Authentication required.
  - 403 Forbidden: Admin access required.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - PATCH /api/properties/<id>/status with JSON body { "status": "APPROVED" }.

**Section sources**
- [src/app/api/properties/[id]/status/route.ts:17-L68](file://src/app/api/properties/[id]/status/route.ts#L17-L68)

### Booking System API

#### List User's Bookings
- Method: GET
- URL: /api/bookings
- Purpose: Retrieve bookings for the authenticated user; landlords see property bookings; admins see all.
- Authentication: Required.
- Response schema:
  - success: boolean
  - data: array of bookings (with student and property details)
- Status codes:
  - 200 OK: Bookings fetched successfully.
  - 401 Unauthorized: Authentication required.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - GET /api/bookings with session cookie.

**Section sources**
- [src/app/api/bookings/route.ts:11-45](file://src/app/api/bookings/route.ts#L11-L45)

#### Create Booking Request
- Method: POST
- URL: /api/bookings
- Purpose: Students submit a booking request for an approved property.
- Authentication: Required (STUDENT).
- Request body schema:
  - propertyId: string (required)
- Response schema:
  - success: boolean
  - data: booking (with property and location details)
  - message: string
- Status codes:
  - 201 Created: Booking request submitted.
  - 400 Bad Request: Missing propertyId or property not approved.
  - 401 Unauthorized: Authentication required.
  - 403 Forbidden: Only students can book.
  - 404 Not Found: Property not found.
  - 409 Conflict: Active booking already exists for the property.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - POST /api/bookings with JSON body { "propertyId": "<property-id>" }.

Validation highlights:
- Only STUDENT role can create bookings.
- Property must be APPROVED.
- Prevents duplicate active bookings.

**Section sources**
- [src/app/api/bookings/route.ts:47-108](file://src/app/api/bookings/route.ts#L47-L108)

#### Update Booking Status
- Method: PATCH
- URL: /api/bookings
- Purpose: Update booking status (CONFIRMED or CANCELLED) with role-based restrictions.
- Authentication: Required.
- Request body schema:
  - bookingId: string (required)
  - status: enum PENDING | CONFIRMED | CANCELLED (required)
- Response schema:
  - success: boolean
  - data: updated booking (with student and property details)
  - message: string
- Status codes:
  - 200 OK: Booking status updated successfully.
  - 400 Bad Request: Missing bookingId/status or invalid status.
  - 401 Unauthorized: Authentication required.
  - 403 Forbidden: Role-based access restrictions.
  - 404 Not Found: Booking not found.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - PATCH /api/bookings with JSON body { "bookingId": "<booking-id>", "status": "CONFIRMED" }.

Role-based restrictions:
- Students can only cancel their own bookings
- Landlords can only update bookings for their properties
- Admins have full access to all bookings

**Section sources**
- [src/app/api/bookings/route.ts:110-181](file://src/app/api/bookings/route.ts#L110-L181)

### Location Services API

#### List Locations
- Method: GET
- URL: /api/locations
- Purpose: Retrieve all locations ordered by classification and name.
- Authentication: Not required.
- Response schema:
  - success: boolean
  - data: array of locations
- Status codes:
  - 200 OK: Locations fetched successfully.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - GET /api/locations to populate property listing forms.

**Section sources**
- [src/app/api/locations/route.ts:11-28](file://src/app/api/locations/route.ts#L11-L28)

### File Upload API

#### Upload Files
- Method: POST
- URL: /api/uploads
- Purpose: Upload files for property listings and verification documents.
- Authentication: Required (LANDLORD or ADMIN).
- Request body: multipart/form-data with file and category fields.
- Query parameters:
  - category: enum image | video | verificationDocument (optional, defaults to image)
- Response schema:
  - success: boolean
  - data: file metadata (name, type, mimeType, size, url)
  - message: string
- Status codes:
  - 201 Created: File uploaded successfully.
  - 400 Bad Request: Invalid file type, missing file, or size exceeded.
  - 401 Unauthorized: Authentication required.
  - 403 Forbidden: Only landlords can upload files.
  - 500 Internal Server Error: Unexpected error.
- Practical example:
  - POST /api/uploads with multipart/form-data containing file and category.

Supported file types and limits:
- Images: JPEG, PNG, WebP up to 5MB
- Videos: MP4, WebM up to 25MB
- Documents: PDF, JPEG, PNG up to 5MB

**Section sources**
- [src/app/api/uploads/route.ts:21-81](file://src/app/api/uploads/route.ts#L21-L81)

## Dependency Analysis

```mermaid
graph LR
A["/api/auth/register"] --> P["Prisma Client<br/>src/lib/prisma.ts"]
B["/api/properties"] --> P
C["/api/properties/[id]/status"] --> P
D["/api/locations"] --> P
E["/api/bookings"] --> P
F["/api/uploads"] --> P
G["NextAuth Config<br/>src/lib/auth.ts"] --> H["/api/auth/[...nextauth]"]
I["Middleware<br/>src/middleware.ts"] --> G
I --> B
I --> C
I --> E
I --> F
P --> S["Prisma Schema<br/>prisma/schema.prisma"]
P --> SC["Schools Data<br/>src/lib/schools.ts"]
```

**Diagram sources**
- [src/app/api/auth/register/route.ts:10-10](file://src/app/api/auth/register/route.ts#L10-L10)
- [src/app/api/properties/route.ts:7-9](file://src/app/api/properties/route.ts#L7-L9)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L7-L10)
- [src/app/api/locations/route.ts:8-9](file://src/app/api/locations/route.ts#L8-L9)
- [src/app/api/bookings/route.ts:6-9](file://src/app/api/bookings/route.ts#L6-L9)
- [src/app/api/uploads/route.ts:5-6](file://src/app/api/uploads/route.ts#L5-L6)
- [src/lib/auth.ts:14-90](file://src/lib/auth.ts#L14-L90)
- [src/middleware.ts:15-38](file://src/middleware.ts#L15-L38)
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- [src/lib/schools.ts:1-31](file://src/lib/schools.ts#L1-L31)
- [prisma/schema.prisma:1-136](file://prisma/schema.prisma#L1-L136)

**Section sources**
- [src/app/api/auth/register/route.ts:10-10](file://src/app/api/auth/register/route.ts#L10-L10)
- [src/app/api/properties/route.ts:7-9](file://src/app/api/properties/route.ts#L7-L9)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L7-L10)
- [src/app/api/locations/route.ts:8-9](file://src/app/api/locations/route.ts#L8-L9)
- [src/app/api/bookings/route.ts:6-9](file://src/app/api/bookings/route.ts#L6-L9)
- [src/app/api/uploads/route.ts:5-6](file://src/app/api/uploads/route.ts#L5-L6)
- [src/lib/auth.ts:14-90](file://src/lib/auth.ts#L14-L90)
- [src/middleware.ts:15-38](file://src/middleware.ts#L15-L38)
- [src/lib/prisma.ts:13-24](file://src/lib/prisma.ts#L13-L24)
- [src/lib/schools.ts:1-31](file://src/lib/schools.ts#L1-L31)
- [prisma/schema.prisma:1-136](file://prisma/schema.prisma#L1-L136)

## Performance Considerations
- Pagination and limits:
  - Properties listing enforces a maximum pageSize of 50 and defaults to 12 items per page.
  - Sorting is supported on price, createdAt, and distanceToCampus with configurable order.
- Database indexing:
  - Prisma schema defines indexes on foreign keys and frequently queried fields (e.g., property status, price).
- Session strategy:
  - JWT-based sessions with a 30-day max age and 24-hour update age, reducing database load for auth checks.
- Prisma client:
  - Singleton pattern with development caching avoids excessive connection pool exhaustion.
- File upload optimization:
  - Supports multiple file categories with appropriate size limits.
  - Secure file naming and sanitization prevents conflicts and security issues.

## Troubleshooting Guide
- Authentication errors:
  - 401 Unauthorized: Ensure a valid session cookie is present. Verify credentials during login.
  - 403 Forbidden: Access is restricted by role. Landlords cannot list properties; only admins can update property status.
- Registration issues:
  - 400 Bad Request: Missing required fields or invalid role.
  - 409 Conflict: Email already registered.
- Property listing issues:
  - 400 Bad Request: Missing required fields or invalid locationId.
  - 403 Forbidden: Non-landlords attempting to list properties.
  - 400 Bad Request: Missing required images for property submission.
- Booking issues:
  - 400 Bad Request: Missing propertyId or property not approved.
  - 404 Not Found: Property does not exist.
  - 409 Conflict: Active booking already exists for the property.
  - 403 Forbidden: Students trying to confirm bookings or landlords updating other's bookings.
- Location services issues:
  - 500 Internal Server Error: Database connectivity issues.
- Upload issues:
  - 400 Bad Request: Unsupported file type or size exceeded.
  - 400 Bad Request: Missing file in request.
  - 403 Forbidden: Non-landlords attempting to upload files.
- Generic errors:
  - 500 Internal Server Error: Unexpected failures during data access or processing. Check server logs for detailed error messages.

**Section sources**
- [src/app/api/auth/register/route.ts:25-56](file://src/app/api/auth/register/route.ts#L25-L56)
- [src/app/api/properties/route.ts:112-136](file://src/app/api/properties/route.ts#L112-L136)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L33-L42)
- [src/app/api/bookings/route.ts:61-87](file://src/app/api/bookings/route.ts#L61-L87)
- [src/app/api/uploads/route.ts:36-57](file://src/app/api/uploads/route.ts#L36-L57)
- [src/lib/auth.ts:53-92](file://src/lib/auth.ts#L53-L92)

## Conclusion
RentalHub-BOUESTI's API provides a comprehensive, role-based set of endpoints for authentication, property management, booking, location services, and file uploads. Authentication is handled securely via NextAuth.js with JWT sessions, while Prisma ensures robust data access. The API responses consistently use a success/error envelope with appropriate HTTP status codes. Frontend pages integrate seamlessly with the backend by posting directly to NextAuth endpoints and calling the API routes with session cookies. The addition of file upload capabilities and enhanced property filtering makes the platform suitable for comprehensive property management needs.

## Appendices

### API Versioning
- No explicit API versioning is implemented in the current codebase. All routes are under /api without a version segment.

**Section sources**
- [src/app/api/auth/register/route.ts:1-6](file://src/app/api/auth/register/route.ts#L1-L6)
- [src/app/api/properties/route.ts:1-4](file://src/app/api/properties/route.ts#L1-L4)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L1-L5)
- [src/app/api/locations/route.ts:1-6](file://src/app/api/locations/route.ts#L1-L6)
- [src/app/api/bookings/route.ts:1-4](file://src/app/api/bookings/route.ts#L1-L4)
- [src/app/api/uploads/route.ts:1-6](file://src/app/api/uploads/route.ts#L1-L6)

### Rate Limiting Considerations
- No explicit rate limiting is implemented in the current codebase. Consider integrating a rate-limiting solution (e.g., Redis-based or middleware) for production deployments to protect sensitive endpoints like registration and login.

### Integration Patterns with the Frontend
- Login:
  - The login page submits credentials to /api/auth/callback/credentials, which NextAuth handles internally.
- Registration:
  - The registration page posts to /api/auth/register with role selection and user details.
- Protected routes:
  - Middleware enforces role-based access to /student, /landlord, and /admin routes.
- Session usage:
  - API routes use getServerSession to access the authenticated user and enforce role-based permissions.
- File uploads:
  - Frontend uses multipart/form-data with category field for different upload types.

**Section sources**
- [src/app/login/page.tsx:51-51](file://src/app/login/page.tsx#L51-L51)
- [src/app/register/page.tsx:50-50](file://src/app/register/page.tsx#L50-L50)
- [src/middleware.ts:15-66](file://src/middleware.ts#L15-L66)
- [src/app/api/bookings/route.ts:13-17](file://src/app/api/bookings/route.ts#L13-L17)
- [src/app/api/properties/route.ts:97-107](file://src/app/api/properties/route.ts#L97-L107)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L17-L28)
- [src/app/api/uploads/route.ts:21-30](file://src/app/api/uploads/route.ts#L21-L30)

### Data Model Overview
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
string reviewedById FK
}
BOOKING {
string id PK
enum status
datetime createdAt
datetime updatedAt
string studentId FK
string propertyId FK
}
USER ||--o{ PROPERTY : "landlords"
USER ||--o{ BOOKING : "students"
USER ||--o{ PROPERTY : "reviewers"
LOCATION ||--o{ PROPERTY : "contains"
PROPERTY ||--o{ BOOKING : "bookings"
```

**Diagram sources**
- [prisma/schema.prisma:44-62](file://prisma/schema.prisma#L44-L62)
- [prisma/schema.prisma:65-78](file://prisma/schema.prisma#L65-L78)
- [prisma/schema.prisma:81-114](file://prisma/schema.prisma#L81-L114)
- [prisma/schema.prisma:117-135](file://prisma/schema.prisma#L117-L135)

### Role-Based Access Control
The system implements comprehensive role-based access control:

- **STUDENT**: Can view properties, create bookings, manage personal booking requests
- **LANDLORD**: Can list properties, view property bookings, upload property files, manage property listings
- **ADMIN**: Full access to all resources, can approve/reject properties, manage all bookings

Access enforcement occurs at both middleware level and individual API endpoints.

**Section sources**
- [src/middleware.ts:6-13](file://src/middleware.ts#L6-L13)
- [src/app/api/properties/route.ts:97-107](file://src/app/api/properties/route.ts#L97-L107)
- [src/app/api/properties/[id]/status/route.ts](file://src/app/api/properties/[id]/status/route.ts#L17-L28)
- [src/app/api/bookings/route.ts:47-57](file://src/app/api/bookings/route.ts#L47-L57)
- [src/app/api/uploads/route.ts:21-30](file://src/app/api/uploads/route.ts#L21-L30)