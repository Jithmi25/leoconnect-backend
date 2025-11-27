# 🦁 LeoConnect Backend

A robust Node.js backend for the LeoConnect mobile application - a community platform for Lions Club members with social features, event management, and content sharing.

## 🚀 Features

- **🔐 Authentication & Authorization**

  - JWT-based authentication
  - Google OAuth integration
  - Role-based access control (Webmaster/Admin privileges)

- **📱 Social Features**

  - Post creation, liking, and commenting
  - Image upload with Cloudinary integration
  - Real-time notifications
  - User profiles and leaderboards

- **📅 Event Management**

  - Event creation and registration
  - Attendee management
  - Event galleries and certificates

- **🗳️ Community Engagement**

  - Polls and voting system
  - Club and district management
  - Leadership directory

- **🛡️ Security**
  - Rate limiting on all endpoints
  - Helmet.js for security headers
  - CORS configuration
  - Input validation and sanitization

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, Google OAuth
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Express Rate Limit
- **Logging**: Morgan
- **Environment**: Dotenv

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Cloudinary account (for image storage)

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd leoconnect-backend
   ```

2. **Install all dependencies**

```bash
    npm install
```

- **This installs all required packages:**

- express - Web framework
- mongoose - MongoDB ODM
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- dotenv - Environment variables
- cors - Cross-origin resource sharing
- helmet - Security headers
- morgan - HTTP request logging
- multer - File upload handling
- cloudinary - Image storage
- express-rate-limit - Rate limiting
- google-auth-library - Google OAuth
- And many more security and utility packages...

3. **Environment Configuration**

- Create a .env file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=port
CLIENT_BASE_URL=your_client_base_URI

# Database
MONGODB_URI=your_mongodb_URI

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRE=30d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret


```

4. **Database Setup**

- Ensure MongoDB is running locally, or
- Update MONGODB_URI with your MongoDB Atlas connection string

5. **Cloudinary Setup**

- Create a free account at Cloudinary
- Get your cloud name, API key, and API secret
- Add them to your .env file

## 🏃‍♂️ Running the Application

- **Development Mode (with auto-restart)**

```bash
npm run dev
Server runs on http://localhost:5000 with hot reloading.
```

- **Production Mode**

```bash
npm start
```

- **Testing**

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

- **Code Quality**

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📡 API Endpoints

- **Authentication (/api/auth)**

- POST /google - Google OAuth login
- GET /me - Get current user profile
- GET /verify - Verify token validity
- POST /mock-google-login - Mock login for development

- **Users (/api/users)**

- GET / - Get all users (with filtering)
- GET /:id - Get user by ID
- PUT /profile - Update user profile
- GET /search/all - Search users by name or club
- GET /leaderboard/all - Get leaderboard
- GET /stats/overview - Get user statistics (Admin only)

- **Posts (/api/posts)**

- GET / - Get all posts
- GET /:id - Get single post
- POST / - Create new post
- PUT /:id - Update post
- DELETE /:id - Delete post
- POST /:id/like - Like/unlike post
- POST /:id/comment - Add comment to post
- GET /club/:clubName - Get posts by club
- GET /user/:userId - Get user's posts

- **Events (/api/events)**

- GET / - Get all events
- GET /:id - Get single event
- POST / - Create new event (Admin only)
- PUT /:id - Update event (Admin only)
- DELETE /:id - Delete event (Admin only)
- POST /:id/register - Register for event
- POST /:id/unregister - Unregister from event
- GET /my/registered - Get user's registered events
- GET /upcoming/all - Get upcoming events
- GET /club/:clubName - Get events by club

- **Polls (/api/polls)**

- GET / - Get all polls
- GET /:id - Get single poll
- POST / - Create new poll (Admin only)
- POST /:id/vote - Vote on poll
- GET /:id/results - Get poll results
- GET /active/all - Get active polls
- GET /my/voted - Get user's voted polls

- **Upload (/api/upload)**

- POST /image - Upload single image
- POST /images - Upload multiple images
- DELETE /image - Delete image
- POST /profile-picture - Update profile picture
- POST /event-images - Upload event images (Admin only)
- GET /stats - Get upload statistics (Admin only)

## 🔐 Authentication & Authorization

- **User Roles**

- Member: Basic user permissions
- Webmaster: Full administrative privileges

- **Protected Routes**
- Most routes require JWT authentication. Include the token in the Authorization header:

```text
Authorization: Bearer <your_jwt_token>
```

- **Rate Limiting**

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per minute
- File Upload: 10 requests per minute

## 🛡️ Security Features

- JWT Token Security: Secure token generation and validation
- Password Hashing: bcryptjs for secure password storage
- Input Validation: Mongoose validation and sanitization
- CORS Protection: Configured for specific origins
- Rate Limiting: Prevents brute force attacks
- Helmet.js: Security headers protection
- File Upload Restrictions: Size and type validation

## Common HTTP Status Codes

- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 409 - Conflict
- 429 - Too Many Requests
- 500 - Internal Server Error

## 📊 API Health Check

- Check if the API is running:

```bash
GET /api/health
```

- Response:

```json
{
  "success": true,
  "message": "🚀 LeoConnect Backend API is running!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

- **LeoConnect Backend - Powering connections within the Lions Club community 🦁**
