/**
 * Generate OpenAPI Specification Script
 * 
 * Generates OpenAPI 3.0 specification from contract files.
 * Run with: npm run contracts:docs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const contractsDir = path.join(__dirname, '../contracts/api');
const outputDir = path.join(__dirname, '../contracts/dist');

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

interface ContractEndpoint {
  endpoint: string;
  method: string;
  version: string;
  description?: string;
  request?: {
    headers?: Record<string, string>;
    body?: Record<string, FieldDef>;
    query?: Record<string, FieldDef>;
  };
  response: {
    success: {
      status: number;
      body: Record<string, unknown>;
    };
    errors?: Array<{
      status: number;
      code: string;
      message?: string;
    }>;
  };
  example?: {
    request?: unknown;
    response?: unknown;
  };
}

interface FieldDef {
  type: string;
  required?: boolean;
  format?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  default?: unknown;
  description?: string;
}

function main(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     OpenAPI Specification Generator    ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Initialize OpenAPI spec
  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: 'LMS API V2',
      version: '2.0.0',
      description: 'Learning Management System REST API - Version 2',
      contact: {
        name: 'LMS Development Team',
        email: 'dev@lms.edu'
      }
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.lms.edu', description: 'Production' }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: []
  };
  
  // Check if contracts directory exists
  if (!fs.existsSync(contractsDir)) {
    console.error(`❌ Contracts directory not found: ${contractsDir}`);
    process.exit(1);
  }
  
  // Find all contract files
  const contractFiles = fs.readdirSync(contractsDir)
    .filter(f => f.endsWith('.contract.ts'));
  
  if (contractFiles.length === 0) {
    console.log('⚠️  No contract files found');
    process.exit(0);
  }
  
  console.log(`Found ${contractFiles.length} contract file(s)\n`);
  
  // Process each contract file
  for (const file of contractFiles) {
    const filePath = path.join(contractsDir, file);
    const tagName = file.replace('.contract.ts', '');
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const contractModule = require(filePath);
      
      // Find the main export
      const exportNames = Object.keys(contractModule);
      const contractExport = exportNames.find(name => 
        name.endsWith('Contract') || name.endsWith('Contracts')
      );
      
      if (contractExport) {
        const contract = contractModule[contractExport];
        
        // Add tag for this contract group
        spec.tags.push({
          name: tagName,
          description: `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} endpoints`
        });
        
        // Process each endpoint
        for (const [endpointName, endpoint] of Object.entries(contract)) {
          addEndpointToSpec(spec, tagName, endpointName, endpoint as ContractEndpoint);
        }
        
        console.log(`✅ Processed: ${file}`);
      } else {
        console.log(`⚠️  Skipped: ${file} (no Contract export found)`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${file} - ${(error as Error).message}`);
    }
  }
  
  // Write YAML output
  const yamlOutput = path.join(outputDir, 'openapi.yaml');
  fs.writeFileSync(yamlOutput, yaml.stringify(spec));
  console.log(`\n📄 Written: ${yamlOutput}`);
  
  // Write JSON output
  const jsonOutput = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(jsonOutput, JSON.stringify(spec, null, 2));
  console.log(`📄 Written: ${jsonOutput}`);
  
  // Print summary
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 GENERATION SUMMARY\n');
  console.log(`   Endpoints documented: ${Object.keys(spec.paths).length}`);
  console.log(`   Tags created: ${spec.tags.length}`);
  console.log(`   Output files:`);
  console.log(`     • openapi.yaml`);
  console.log(`     • openapi.json`);
  console.log('\n' + '─'.repeat(50));
  console.log('\n✅ OpenAPI spec generated! Use with Swagger UI or similar.\n');
}

function addEndpointToSpec(
  spec: OpenAPISpec,
  tag: string,
  endpointName: string,
  endpoint: ContractEndpoint
): void {
  const path = endpoint.endpoint;
  const method = endpoint.method.toLowerCase();
  
  if (!spec.paths[path]) {
    spec.paths[path] = {};
  }
  
  const operation: Record<string, unknown> = {
    tags: [tag],
    summary: endpointName,
    description: endpoint.description || `${endpointName} endpoint`,
    operationId: `${tag}_${endpointName}`,
    responses: {}
  };
  
  // Add request body if present
  if (endpoint.request?.body) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: bodyToSchema(endpoint.request.body),
          example: endpoint.example?.request
        }
      }
    };
  }
  
  // Add query parameters if present
  if (endpoint.request?.query) {
    operation.parameters = Object.entries(endpoint.request.query).map(([name, field]) => ({
      name,
      in: 'query',
      required: field.required || false,
      schema: {
        type: field.type,
        default: field.default
      },
      description: field.description
    }));
  }
  
  // Add security if headers include Authorization
  if (endpoint.request?.headers?.Authorization) {
    operation.security = [{ bearerAuth: [] }];
  }
  
  // Add success response
  const responses = operation.responses as Record<string, unknown>;
  responses[endpoint.response.success.status.toString()] = {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: endpoint.response.success.body
        },
        example: endpoint.example?.response
      }
    }
  };
  
  // Add error responses
  if (endpoint.response.errors) {
    for (const error of endpoint.response.errors) {
      responses[error.status.toString()] = {
        description: error.message || error.code,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: error.code },
                    message: { type: 'string', example: error.message }
                  }
                }
              }
            }
          }
        }
      };
    }
  }
  
  (spec.paths[path] as Record<string, unknown>)[method] = operation;
}

function bodyToSchema(body: Record<string, FieldDef>): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  
  for (const [field, spec] of Object.entries(body)) {
    properties[field] = {
      type: spec.type,
      format: spec.format,
      minLength: spec.minLength,
      maxLength: spec.maxLength,
      enum: spec.enum,
      default: spec.default,
      description: spec.description
    };
    
    // Remove undefined values
    Object.keys(properties[field] as Record<string, unknown>).forEach(key => {
      if ((properties[field] as Record<string, unknown>)[key] === undefined) {
        delete (properties[field] as Record<string, unknown>)[key];
      }
    });
    
    if (spec.required) {
      required.push(field);
    }
  }
  
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined
  };
}

main();
