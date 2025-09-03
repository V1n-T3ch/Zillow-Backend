# Zillow Backend

## Overview
This project is a backend service for managing properties and handling image uploads using the B2 storage service. It provides APIs for property management, user authentication, and image handling.

## Project Structure
```
zillow-backend
├── src
│   ├── index.js                # Entry point of the application
│   ├── config
│   │   ├── b2Config.js         # B2 storage configuration
│   │   └── serverConfig.js      # Server configuration
│   ├── controllers
│   │   ├── imageController.js   # Controller for image operations
│   │   └── propertyController.js # Controller for property operations
│   ├── middleware
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js       # Error handling middleware
│   │   └── fileUpload.js         # File upload middleware
│   ├── routes
│   │   ├── imageRoutes.js        # Routes for image operations
│   │   └── propertyRoutes.js     # Routes for property operations
│   ├── services
│   │   └── b2Service.js          # Service for interacting with B2
│   └── utils
│       ├── fileHelpers.js        # Utility functions for file handling
│       └── responseFormatter.js   # Utility functions for response formatting
├── .env.example                  # Example environment variables
├── .gitignore                    # Files to ignore in Git
├── package.json                  # NPM configuration
└── README.md                     # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   cd zillow-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template and fill in the required environment variables.

4. Start the server:
   ```
   npm start
   ```

## Usage
- The API provides endpoints for managing properties and images. Refer to the individual route files for detailed endpoint information.
- Ensure that you have the necessary permissions and configurations set up for B2 storage to handle image uploads.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.