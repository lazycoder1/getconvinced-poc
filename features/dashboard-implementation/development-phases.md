# Development Phases

## Overview
This document outlines the phased approach for implementing the multi-website dashboard system.

## Phase 1: Infrastructure & Database Setup (1-2 days)

### Objectives
- Set up PostgreSQL database
- Configure AWS S3 bucket
- Create database connection utilities
- Set up environment configuration

### Tasks
1. **Database Setup**
   - Create PostgreSQL database instance
   - Run schema migrations
   - Set up connection pooling
   - Create database utilities

2. **S3 Configuration**
   - Create S3 bucket with proper permissions
   - Set up CORS policy for web uploads
   - Configure signed URL generation
   - Test upload/download functionality

3. **Environment Setup**
   - Add environment variables
   - Set up database connection strings
   - Configure AWS credentials
   - Add S3 bucket configuration

4. **Initial Data**
   - Insert HubSpot as first website
   - Create basic folder structure in S3
   - Test database connections

### Deliverables
- ✅ Database schema applied
- ✅ S3 bucket configured
- ✅ Connection utilities working
- ✅ Environment configuration documented

## Phase 2: Core Dashboard UI (3-4 days)

### Objectives
- Create basic dashboard layout
- Implement website CRUD operations
- Build screenshot upload functionality
- Create annotation system

### Tasks
1. **Dashboard Layout**
   - Create main dashboard layout component
   - Implement responsive sidebar navigation
   - Add header with breadcrumbs
   - Set up routing structure

2. **Website Management**
   - Create website list page
   - Implement website creation form
   - Add website editing functionality
   - Create website deletion (with confirmation)

3. **Screenshot Upload**
   - Build file upload component with drag & drop
   - Implement S3 upload functionality
   - Add image validation (type, size)
   - Create upload progress indicators

4. **Annotation System**
   - Create screenshot display component
   - Implement annotation text areas
   - Add auto-save functionality
   - Create annotation preview mode

### Deliverables
- ✅ Dashboard layout with navigation
- ✅ Website CRUD operations
- ✅ Screenshot upload functionality
- ✅ Basic annotation system

## Phase 3: System Prompt Management (2-3 days)

### Objectives
- Implement prompt upload and management
- Create prompt editor interface
- Add prompt versioning
- Integrate with existing prompt structure

### Tasks
1. **Prompt Upload**
   - Create markdown file upload component
   - Implement S3 storage for prompts
   - Add file validation for markdown files
   - Create upload progress tracking

2. **Prompt Editor**
   - Build markdown editor component
   - Add syntax highlighting
   - Implement preview mode
   - Create save/discard functionality

3. **Prompt Management**
   - List prompts per website
   - Set active prompt functionality
   - Add prompt deletion
   - Create prompt history/versioning

4. **Integration Testing**
   - Test prompt loading from S3
   - Verify markdown parsing
   - Test active prompt selection

### Deliverables
- ✅ Prompt upload and storage
- ✅ Markdown editor interface
- ✅ Prompt management system
- ✅ Integration with S3

## Phase 4: Agent Integration (2-3 days)

### Objectives
- Modify existing realtime agent for dynamic configs
- Create configuration loading system
- Implement prompt stitching
- Add loading states

### Tasks
1. **Modify RealtimeVoiceAgent**
   - Update component to accept dynamic configuration
   - Modify prompt loading to use external source
   - Update screenshot handling for dynamic content
   - Add configuration validation

2. **Configuration Loader**
   - Create API endpoint for config loading
   - Implement prompt combination logic
   - Add screenshot URL generation
   - Create error handling for missing configs

3. **Prompt Stitching**
   - Combine base prompts with website-specific content
   - Include screenshot annotations
   - Maintain existing prompt structure
   - Add fallback for missing components

4. **Loading States**
   - Create loading screen for agent initialization
   - Add progress indicators
   - Implement error boundaries
   - Add retry functionality

### Deliverables
- ✅ Dynamic configuration support in agent
- ✅ Configuration loading API
- ✅ Prompt stitching functionality
- ✅ Loading states and error handling

## Phase 5: Link Generation & Demo (2-3 days)

### Objectives
- Create agent demo page
- Implement link generation system
- Add copy-to-clipboard functionality
- Test end-to-end flow

### Tasks
1. **Agent Demo Page**
   - Create `/agent-demo` page structure
   - Implement website parameter handling
   - Add configuration loading on page load
   - Integrate with existing agent component

2. **Link Generation**
   - Create link generation component
   - Add copy-to-clipboard functionality
   - Display formatted URLs
   - Add QR code generation (optional)

3. **URL Routing**
   - Move existing demo to `/agent-demo`
   - Update routing configuration
   - Add parameter validation
   - Create fallback for invalid websites

4. **Testing & Polish**
   - Test end-to-end user flow
   - Add responsive design improvements
   - Implement proper error handling
   - Add loading states throughout

### Deliverables
- ✅ Agent demo page with dynamic loading
- ✅ Link generation system
- ✅ Copy-to-clipboard functionality
- ✅ End-to-end flow testing

## Phase 6: Polish & Production (2-3 days)

### Objectives
- Add final touches and optimizations
- Implement security measures
- Add monitoring and analytics
- Prepare for production deployment

### Tasks
1. **Security Enhancements**
   - Add input validation and sanitization
   - Implement rate limiting
   - Add file upload security (malware scanning)
   - Set up proper CORS policies

2. **Performance Optimization**
   - Optimize image loading and caching
   - Implement lazy loading for screenshots
   - Add database query optimization
   - Compress and optimize assets

3. **Error Handling & Monitoring**
   - Add comprehensive error boundaries
   - Implement logging system
   - Add health check endpoints
   - Create monitoring dashboards

4. **Documentation & Testing**
   - Create user documentation
   - Add unit tests for critical components
   - Create integration tests
   - Document API endpoints

### Deliverables
- ✅ Security measures implemented
- ✅ Performance optimizations
- ✅ Monitoring and logging
- ✅ Documentation and tests

## Timeline Summary

| Phase | Duration | Focus |
|-------|----------|--------|
| 1 | 1-2 days | Infrastructure & Database |
| 2 | 3-4 days | Core Dashboard UI |
| 3 | 2-3 days | System Prompt Management |
| 4 | 2-3 days | Agent Integration |
| 5 | 2-3 days | Link Generation & Demo |
| 6 | 2-3 days | Polish & Production |

**Total Estimated Time: 12-18 days**

## Dependencies

### External Dependencies
- PostgreSQL database instance
- AWS S3 bucket with proper permissions
- AWS SDK for S3 operations
- Database ORM (Prisma recommended)
- File upload library (react-dropzone)

### Internal Dependencies
- Existing RealtimeVoiceAgent component
- Current prompt structure and format
- Existing UI design system
- Current authentication system (if any)

## Risk Mitigation

1. **Database Migration Risks**: Create backup before migrations
2. **S3 Configuration Issues**: Test with small files first
3. **Agent Integration Complexity**: Start with simple configuration, iterate
4. **Performance Issues**: Monitor and optimize queries early
5. **Security Vulnerabilities**: Implement security measures from start

## Success Criteria

- ✅ Dashboard can create and manage websites
- ✅ Screenshots can be uploaded and annotated
- ✅ System prompts can be managed and combined
- ✅ Agent demo loads with dynamic configuration
- ✅ Users can generate and share agent links
- ✅ System is secure and performant
