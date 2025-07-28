# ChatNest - AI Chat Application

A modern, full-stack chat application with AI integration, built with React, FastAPI, and Firebase.

## 🚀 Features

- **Real-time Chat Interface** - Modern ChatGPT-style UI
- **AI Integration** - Powered by Mistral AI
- **User Authentication** - Firebase Authentication
- **Message Persistence** - MongoDB storage
- **MCP Integration** - Model Context Protocol support
- **Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Shadcn/ui** components
- **Firebase** for authentication

### Backend
- **FastAPI** (Python)
- **MongoDB** for data storage
- **JWT** authentication
- **Mistral AI** integration
- **MCP** (Model Context Protocol)

## 📁 Project Structure

```
Skillrank25/
├── chatnest/
│   ├── backend/          # FastAPI backend
│   │   ├── routes.py     # API endpoints
│   │   ├── models.py     # Data models
│   │   ├── main.py       # Server entry point
│   │   └── ...
│   └── frontend/         # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── services/
│       │   └── ...
│       └── ...
├── task1/                # Python tasks
├── task2/                # Additional tasks
└── README.md
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- MongoDB Atlas account
- Firebase project
- Mistral AI API key

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd chatnest/backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create environment file:
   ```bash
   python create_env.py
   ```

4. Update `.env` file with your credentials:
   - MongoDB connection string
   - Firebase project settings
   - Mistral AI API key
   - JWT secret

5. Start the backend server:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd chatnest/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.sample .env
   ```

4. Update `.env` file with your Firebase configuration

5. Start development server:
   ```bash
   npm run dev
   ```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **CORS Protection** - Restricted origins
- **Environment Variables** - No hardcoded secrets
- **Input Validation** - Sanitized user inputs
- **Rate Limiting** - API abuse prevention

## 🌐 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User authentication

### Chat
- `POST /messages/` - Send message
- `GET /messages/{conversation_id}` - Get messages
- `POST /conversations/` - Create conversation
- `GET /conversations/` - Get conversations

### AI
- `POST /ai/generate` - Generate AI response
- `POST /mcp/*` - MCP integration endpoints

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables
2. Deploy to your preferred platform (Railway, Render, etc.)
3. Configure CORS origins for your domain

### Frontend Deployment
1. Build the project: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Configure environment variables

## 📝 Environment Variables

### Backend (.env)
```env
MONGODB_URL=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
MISTRAL_API_KEY=your-mistral-api-key
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: Make sure to never commit sensitive information like API keys or database credentials. Always use environment variables for configuration. 