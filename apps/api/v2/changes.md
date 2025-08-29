# Cal.com API v2 - Changes and Features

## Overview
Cal.com API v2 represents a significant architectural evolution from the previous API versions, introducing a modern NestJS-based framework with enhanced security, performance, and enterprise features.

## Key Architectural Changes

### 1. Framework Migration
- **From**: Legacy API structure
- **To**: Modern NestJS framework with TypeScript
- **Benefits**: Better type safety, modular architecture, enhanced middleware support

### 2. New Project Structure
```
src/
├── config/          # Configuration management
├── lib/            # Core utilities and libraries
├── middleware/     # Request/response processing
├── modules/        # Feature modules
├── ee/            # Enterprise features (commercial license)
└── common/        # Shared components
```

## Core Features

### 1. Enhanced Security
- **Custom Throttler Guard**: Advanced rate limiting with Redis storage
- **API Key Authentication**: Dedicated API key management system
- **OAuth Client Support**: Enhanced OAuth flow handling
- **Role-based Access Control**: Granular permission system

### 2. Middleware Stack
- **Body Parsing**: Smart JSON/Raw body handling
- **Request ID Tracking**: Unique request identification
- **Logging**: Comprehensive request/response logging
- **Rate Limiting**: Per-endpoint and global rate limiting
- **Security Headers**: Helmet integration for security

### 3. Configuration Management
- **Environment-based Config**: Flexible configuration loading
- **Type-safe Config**: TypeScript interfaces for all config
- **License Key Management**: Enterprise license validation
- **Database Configuration**: Separate read/write database URLs

## Enterprise Features (EE)

### 1. Commercial License Required
- **Multiplayer APIs**: Team and organization features
- **Advanced Scheduling**: Complex booking scenarios
- **Enterprise Integrations**: Google Calendar, Salesforce, etc.
- **Advanced Routing**: Complex form routing and workflows

### 2. Module Versioning
- **Bookings**: Multiple versions (2024-04-15, 2024-08-13)
- **Event Types**: Versioned implementations (2024-04-15, 2024-06-14)
- **Schedules**: Progressive enhancements (2024-04-15, 2024-06-11)
- **Slots**: Time slot management versions (2024-04-15, 2024-09-04)

## API Modules

### 1. Core Modules
- **Users**: User management and profiles
- **Teams**: Team collaboration features
- **Organizations**: Multi-tenant organization support
- **Bookings**: Appointment scheduling system
- **Event Types**: Meeting type definitions

### 2. Integration Modules
- **Calendars**: Calendar synchronization
- **Conferencing**: Video meeting integration
- **Webhooks**: External system notifications
- **Stripe**: Payment processing
- **OAuth**: Third-party authentication

### 3. Utility Modules
- **Redis**: Caching and session management
- **Prisma**: Database ORM integration
- **JWT**: Token-based authentication
- **Timezone**: Global timezone handling

## Development Features

### 1. Testing Infrastructure
- **Unit Tests**: Jest-based testing framework
- **E2E Tests**: Comprehensive integration testing
- **Test Coverage**: Built-in coverage reporting
- **Mock Support**: HTTP request mocking

### 2. Development Tools
- **Hot Reload**: Watch mode for development
- **Swagger Documentation**: Auto-generated API docs
- **TypeScript**: Full type safety
- **ESLint/Prettier**: Code quality tools

### 3. Build System
- **Workspace Dependencies**: Platform library integration
- **Docker Support**: Containerized development
- **Environment Management**: Flexible environment configuration

## Performance Enhancements

### 1. Caching Strategy
- **Redis Integration**: High-performance caching
- **LRU Cache**: Memory-efficient caching
- **Rate Limit Storage**: Distributed rate limiting

### 2. Database Optimization
- **Read/Write Separation**: Database load balancing
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Prisma-based query optimization

### 3. Request Processing
- **Async Processing**: Non-blocking request handling
- **Queue Management**: Bull queue integration
- **Background Jobs**: Offloaded task processing

## Security Features

### 1. Authentication
- **Multi-method Auth**: API keys, OAuth, JWT tokens
- **Guard System**: Route-level security enforcement
- **Token Validation**: Secure token verification

### 2. Rate Limiting
- **Per-endpoint Limits**: Custom rate limits per API
- **IP-based Tracking**: Client identification
- **Block Duration**: Configurable blocking periods
- **Redis Storage**: Distributed rate limit tracking

### 3. Input Validation
- **Zod Schemas**: Runtime type validation
- **Class Validator**: DTO validation
- **Sanitization**: Input cleaning and filtering

## Deployment & Operations

### 1. Container Support
- **Docker**: Containerized deployment
- **Docker Compose**: Local development setup
- **Multi-stage Builds**: Optimized production images

### 2. Environment Management
- **Environment Variables**: Flexible configuration
- **Secrets Management**: Secure credential handling
- **Feature Flags**: Runtime feature toggling

### 3. Monitoring & Observability
- **Sentry Integration**: Error tracking and monitoring
- **Structured Logging**: Winston-based logging
- **Request Tracing**: Request ID correlation
- **Performance Metrics**: Built-in monitoring

## Migration Notes

### 1. Breaking Changes
- **API Endpoints**: New routing structure
- **Authentication**: Enhanced security requirements
- **Response Format**: Standardized response structure
- **Error Handling**: Consistent error responses

### 2. Upgrade Path
- **Gradual Migration**: Versioned API support
- **Backward Compatibility**: Legacy endpoint support
- **Documentation**: Comprehensive migration guides

## Future Roadmap

### 1. Planned Features
- **GraphQL Support**: Alternative query language
- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: Usage metrics and insights
- **Plugin System**: Extensible architecture

### 2. Performance Goals
- **Response Time**: Sub-100ms API responses
- **Throughput**: 10k+ requests per second
- **Scalability**: Horizontal scaling support
- **Reliability**: 99.9% uptime target

## Support & Documentation

### 1. Resources
- **API Reference**: Swagger/OpenAPI documentation
- **Code Examples**: Sample implementations
- **SDK Libraries**: Client library support
- **Community**: Developer community support

### 2. Licensing
- **Open Source**: Core API under AGPLv3
- **Enterprise**: Commercial features require license
- **Pricing**: Hosted plan pricing available
- **Contact**: License inquiries via cal.com

---

*This document reflects the current state of Cal.com API v2 as of the latest update. For the most current information, please refer to the official documentation and repository.*
