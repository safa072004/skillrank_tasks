# ChatNest Backend

This is the backend for the ChatNest project, built with **FastAPI** (Python) and **MongoDB** for data storage. It is designed to handle user messages, timestamps, and conversation history, providing a robust API for chat applications. **Now with MCP (Model Context Protocol) integration!**

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [MCP Integration](#mcp-integration)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [Development](#development)
- [License](#license)

---

## Features
- User message storage
- Timestamps for each message
- Conversation history retrieval
- Fast, async API with FastAPI
- MongoDB for flexible, scalable data storage
- **MCP (Model Context Protocol) integration**
- **Enhanced AI generation with MCP fallback**
- **Tool integration and context management**
- **JWT-based authentication**

---

## Tech Stack
- **Backend Framework:** FastAPI (Python 3.8+)
- **Database:** MongoDB (local or cloud, e.g., MongoDB Atlas)
- **ODM:** Motor (async MongoDB driver for Python)
- **MCP Integration:** Model Context Protocol SDK
- **Authentication:** JWT with Passlib
- **AI Services:** Mistral AI + MCP servers

---

## Data Model

### Message
| Field           | Type      | Description                       |
|-----------------|-----------|-----------------------------------|
| `id`            | string    | Unique message ID                 |
| `user_id`       | string    | ID of the user who sent the msg   |
| `content`       | string    | Message text                      |
| `timestamp`     | datetime  | When the message was sent         |
| `conversation_id`| string   | (Optional) Conversation reference |

### Conversation (Optional)
| Field           | Type      | Description                       |
|-----------------|-----------|-----------------------------------|
| `id`            | string    | Unique conversation ID            |
| `user_ids`      | [string]  | Users in the conversation         |
| `messages`      | [Message] | List of messages                  |
| `created_at`    | datetime  | When the conversation started     |

---

## MCP Integration

ChatNest now includes comprehensive **MCP (Model Context Protocol)** integration, allowing your application to interact with MCP-compatible servers and tools. This provides a standardized way to communicate with various AI models and services.

### MCP Features
- **Client Registration**: Automatic registration with MCP servers
- **Message Handling**: Send/receive messages through MCP protocol
- **Tool Integration**: Access and call tools available on MCP servers
- **Context Management**: Send contextual information to MCP servers
- **Fallback Support**: Graceful fallback to Mistral AI when MCP is unavailable
- **Enhanced AI Generation**: Combined MCP and traditional AI responses

### MCP Endpoints
- `POST /mcp/initialize` - Initialize MCP client connection
- `GET /mcp/status` - Get MCP client status
- `POST /mcp/message` - Send message to MCP server
- `GET /mcp/tools` - Get available tools from MCP server
- `POST /mcp/tool` - Call a specific tool on MCP server
- `POST /mcp/context` - Send context data to MCP server
- `POST /ai/generate-enhanced` - Enhanced AI generation with MCP fallback

For detailed MCP documentation, see [MCP_INTEGRATION.md](./MCP_INTEGRATION.md).

---

## API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /login` - Login and get JWT token

### Messages
- `POST /messages/` - Send a new message
- `GET /messages/{conversation_id}` - Get messages for a conversation

### Conversations
- `POST /conversations/` - Create a new conversation
- `GET /conversations/{user_id}` - Get conversations for a user

### AI Generation
- `POST /ai/generate` - Generate AI response using Mistral
- `POST /ai/generate-enhanced` - Enhanced AI generation with MCP fallback

### MCP Integration
- `POST /mcp/initialize` - Initialize MCP client connection
- `GET /mcp/status` - Get MCP client status
- `POST /mcp/message` - Send message to MCP server
- `GET /mcp/tools` - Get available tools from MCP server
- `POST /mcp/tool` - Call a specific tool on MCP server
- `POST /mcp/context` - Send context data to MCP server

---

## Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatnest/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `chatnest` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `MISTRAL_API_KEY` | Mistral AI API key | (optional) |
| `MCP_CLIENT_ID` | MCP client identifier | `chatnest-client` |
| `MCP_CLIENT_SECRET` | MCP client secret | (required for MCP) |
| `MCP_SERVER_URL` | MCP server URL | `http://localhost:9000/mcp` |

---

## Running the Server

```bash
uvicorn main:app --reload
```

The server will start on `http://localhost:8000`

## Testing

### Run MCP Integration Tests

```bash
python test_mcp.py
```

This will test all MCP endpoints and basic functionality. The test script will:
- Register and login a test user
- Test basic endpoints (root, conversations)
- Test MCP endpoints (status, initialization, tools, messages)
- Test enhanced AI generation

**Note**: Some MCP endpoints may fail if no MCP server is running - this is expected behavior as the integration includes fallback mechanisms.

---

## Development

### API Documentation
Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Project Structure
```
backend/
├── main.py              # FastAPI app initialization
├── routes.py            # API routes and endpoints
├── models.py            # Pydantic models
├── db.py               # Database connection
├── mcp_integration.py  # MCP client integration
├── test_mcp.py         # MCP integration tests
├── requirements.txt    # Python dependencies
├── env.example         # Environment variables template
└── MCP_INTEGRATION.md  # Detailed MCP documentation
```

---

## License

This project is licensed under the MIT License.

