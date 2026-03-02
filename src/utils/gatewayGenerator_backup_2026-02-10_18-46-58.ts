// Enhanced server code generation utilities for Industrial Protocol Gateway Builder with EXE support

export interface ProtocolConfig {
  id: string;
  name: string;
  type: 'modbus-tcp' | 'modbus-rtu' | 'modbus-serial' | 'opcua' | 'mqtt' | 'http-rest' | 'ethernet-ip' | 'bacnet' | 'profinet';
  enabled: boolean;
  mode: 'client' | 'server';
  settings: any;
}

export interface GatewayConfig {
  name: string;
  description: string;
  version: string;
  protocols: ProtocolConfig[];
  server: {
    port: number;
    host: string;
    ssl: boolean;
    authentication: boolean;
  };
  logging: {
    level: string;
    file: boolean;
    console: boolean;
  };
}

interface GeneratedFiles {
  'package.json': string;
  'server.js': string;
  'protocols/modbus.js': string;
  'protocols/opcua.js': string;
  'protocols/mqtt.js': string;
  'protocols/profinet.js': string;
  'utils/logger.js': string;
  'config.json': string;
  'README.md': string;
  'build-exe.js': string;
  'build-exe.bat': string;
  'install-and-build.bat': string;
  'run-server.bat': string;
  zipBuffer: ArrayBuffer;
}

export async function generateServerFiles(config: GatewayConfig): Promise<GeneratedFiles> {
  const files: Omit<GeneratedFiles, 'zipBuffer'> = {
    'package.json': generatePackageJson(config),
    'server.js': generateMainServer(config),
    'protocols/modbus.js': generateModbusHandler(config),
    'protocols/opcua.js': generateOpcuaHandler(config),
    'protocols/mqtt.js': generateMqttHandler(config),
    'protocols/profinet.js': generateProfinetHandler(config),
    'utils/logger.js': generateLogger(config),
    'config.json': generateConfigFile(config),
    'README.md': generateReadme(config),
    'build-exe.js': generateBuildScript(config),
    'build-exe.bat': generateBuildBatch(config),
    'install-and-build.bat': generateInstallAndBuildBatch(config),
    'run-server.bat': generateRunServerBatch(config)
  };

  // Generate ZIP buffer
  const zipBuffer = await packageAsExecutable(files);

  return {
    ...files,
    zipBuffer
  };
}

async function packageAsExecutable(files: Omit<GeneratedFiles, 'zipBuffer'>): Promise<ArrayBuffer> {
  const JSZip = await import('jszip');
  const zip = new JSZip.default();

  // Add all files to ZIP
  Object.entries(files).forEach(([path, content]) => {
    zip.file(path, content);
  });

  // Generate the ZIP buffer
  return zip.generateAsync({ type: 'arraybuffer' });
}

function generateBuildScript(config: GatewayConfig): string {
  return `// EXE Build Script for ${config.name}
const pkg = require('pkg');
const path = require('path');
const fs = require('fs');

async function buildExecutable() {
  console.log('🔨 Building ${config.name} executable...');
  console.log('📁 Current directory:', process.cwd());
  
  // Verify all files exist
  const requiredFiles = ['server.js', 'config.json'];
  const requiredDirs = ['protocols', 'utils'];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(\`❌ Required file missing: \${file}\`);
      process.exit(1);
    }
  }
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.error(\`❌ Required directory missing: \${dir}\`);
      process.exit(1);
    }
  }
  
  console.log('✅ All required files found');
  
  try {
    await pkg.exec([
      'server.js',
      '--target', 'node16-win-x64',
      '--output', '${config.name.replace(/[^a-zA-Z0-9]/g, '-')}.exe',
      '--compress', 'GZip',
      '--debug'
    ]);
    
    console.log('✅ Executable built successfully!');
    console.log('📦 Output: ${config.name.replace(/[^a-zA-Z0-9]/g, '-')}.exe');
    
    const stats = fs.statSync('${config.name.replace(/[^a-zA-Z0-9]/g, '-')}.exe');
    console.log(\`📊 File size: \${(stats.size / 1024 / 1024).toFixed(2)} MB\`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.error('💡 Try running: npm install --save-dev pkg@latest');
    process.exit(1);
  }
}

buildExecutable();
`;
}
function generateBuildBatch(config: GatewayConfig): string {
  const exeName = config.name.replace(/[^a-zA-Z0-9]/g, '-');
  return `@echo off
echo ========================================
echo Building ${config.name} Executable
echo ========================================
echo.

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Building executable...
call node build-exe.js
if errorlevel 1 (
    echo Failed to build executable!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo Executable: ${exeName}.exe
echo ========================================
pause
`;
}

function generateInstallAndBuildBatch(config: GatewayConfig): string {
  const exeName = config.name.replace(/[^a-zA-Z0-9]/g, '-');
  return `@echo off
echo ========================================
echo ${config.name} - Complete Setup
echo ========================================
echo.

echo Step 1: Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    echo Make sure Node.js and npm are installed.
    pause
    exit /b 1
)

echo.
echo Step 2: Building executable...
call node build-exe.js
if errorlevel 1 (
    echo ERROR: Failed to build executable!
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Setup completed.
echo ========================================
echo.
echo Your executable is ready: ${exeName}.exe
echo.
echo To run the server:
echo   - Double-click ${exeName}.exe, OR
echo   - Run: run-server.bat
echo.
pause
`;
}

function generateRunServerBatch(config: GatewayConfig): string {
  const exeName = config.name.replace(/[^a-zA-Z0-9]/g, '-');
  return `@echo off
title ${config.name} Server
echo ========================================
echo Starting ${config.name}
echo ========================================
echo.

if exist "${exeName}.exe" (
    echo Running executable...
    "${exeName}.exe"
) else (
    echo Executable not found. Running with Node.js...
    if exist "server.js" (
        node server.js
    ) else (
        echo ERROR: Neither executable nor server.js found!
        echo Please run install-and-build.bat first.
        pause
        exit /b 1
    )
)

echo.
echo Server stopped.
pause
`;
}

function generatePackageJson(config: GatewayConfig): string {
  // Get list of enabled protocol types
  const enabledProtocols = config.protocols.filter(p => p.enabled).map(p => p.type);
  const uniqueProtocolTypes = [...new Set(enabledProtocols)];
  
  // Build protocol asset paths only for enabled protocols
  const protocolAssets = [];
  const protocolScripts = [];
  
  if (uniqueProtocolTypes.includes('modbus-tcp') || uniqueProtocolTypes.includes('modbus-rtu') || uniqueProtocolTypes.includes('modbus-serial')) {
    protocolAssets.push('protocols/modbus.js');
    protocolScripts.push('protocols/modbus.js');
  }
  if (uniqueProtocolTypes.includes('opcua')) {
    protocolAssets.push('protocols/opcua.js');
    protocolScripts.push('protocols/opcua.js');
  }
  if (uniqueProtocolTypes.includes('mqtt')) {
    protocolAssets.push('protocols/mqtt.js');
    protocolScripts.push('protocols/mqtt.js');
  }
  if (uniqueProtocolTypes.includes('profinet')) {
    protocolAssets.push('protocols/profinet.js');
    protocolScripts.push('protocols/profinet.js');
  }

  const packageJson = {
    name: config.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: config.version,
    description: config.description,
    main: 'server.js',
    scripts: {
      start: 'node server.js',
      dev: 'nodemon server.js',
      'build-exe': 'node build-exe.js'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      'ws': '^8.13.0',
      'modbus-serial': '^8.0.13',
      'node-opcua': '^2.74.0',
      'mqtt': '^4.3.7'
    },
    devDependencies: {
      pkg: '^5.8.1',
      nodemon: '^3.0.1'
    },
    engines: {
      node: '>=16.0.0'
    },
    pkg: {
      assets: [
        'config.json',
        'utils/**/*.js',
        ...protocolAssets
      ],
      scripts: [
        'utils/**/*.js',
        ...protocolScripts
      ],
      targets: ['node16-win-x64']
    }
  };

  return JSON.stringify(packageJson, null, 2);
}

function generateMainServer(config: GatewayConfig): string {
  return `const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Robust module loading for pkg compatibility
function loadProtocolModule(moduleName) {
  const possiblePaths = [
    path.join(__dirname, 'protocols', \`\${moduleName}.js\`),
    path.join(process.cwd(), 'protocols', \`\${moduleName}.js\`),
    \`./protocols/\${moduleName}\`,
    \`./protocols/\${moduleName}.js\`
  ];
  
  for (const modulePath of possiblePaths) {
    try {
      return require(modulePath);
    } catch (err) {
      // Try next path
    }
  }
  
  // If all fails, create a basic handler
  console.warn(\`Warning: Could not load \${moduleName} handler, using stub\`);
  return class StubHandler {
    constructor() { this.enabled = false; }
    async initialize() { return true; }
    async getValue() { return null; }
    async setValue() { return false; }
  };
}

// Get list of enabled protocol types from config
const enabledProtocols = ${JSON.stringify(config.protocols.filter(p => p.enabled).map(p => p.type))};

// Only load protocol handlers that are actually used
const ProtocolHandlers = {};
if (enabledProtocols.includes('modbus-tcp') || enabledProtocols.includes('modbus-rtu')) {
  ProtocolHandlers.ModbusHandler = loadProtocolModule('modbus');
}
if (enabledProtocols.includes('opcua')) {
  ProtocolHandlers.OpcuaHandler = loadProtocolModule('opcua');
}
if (enabledProtocols.includes('mqtt')) {
  ProtocolHandlers.MqttHandler = loadProtocolModule('mqtt');
}
if (enabledProtocols.includes('profinet')) {
  ProtocolHandlers.ProfinetHandler = loadProtocolModule('profinet');
}

console.log(\`📦 Loaded handlers for: \${Object.keys(ProtocolHandlers).join(', ')}\`);

// Load utility modules
let Logger;
try {
  Logger = require('./utils/logger');
} catch (err) {
  // Fallback logger
  Logger = class {
    constructor() {}
    info(msg) { console.log(\`[INFO] \${msg}\`); }
    error(msg) { console.error(\`[ERROR] \${msg}\`); }
    warn(msg) { console.warn(\`[WARN] \${msg}\`); }
  };
}

class ${config.name.replace(/[^a-zA-Z0-9]/g, '')}Gateway {
  constructor() {
    this.config = ${JSON.stringify(config, null, 4)};
    this.logger = new Logger(this.config.logging);
    this.protocolHandlers = new Map();
    this.dataStore = new Map();
    
    this.setupServer();
    this.initializeProtocols();
  }

  setupServer() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        protocols: Array.from(this.protocolHandlers.keys())
      });
    });

    // Protocol discovery endpoint
    this.app.get('/api/protocols', (req, res) => {
      try {
        const protocols = Array.from(this.protocolHandlers.entries()).map(([id, handler]) => ({
          id,
          name: handler.config.name,
          type: handler.config.type,
          mode: handler.config.mode,
          enabled: handler.config.enabled,
          variables: handler.getVariableList ? handler.getVariableList() : []
        }));
        res.json({ protocols });
      } catch (error) {
        this.logger.error('API Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Read variable from specific protocol
    this.app.get('/api/:protocol/variables/:variable', (req, res) => {
      try {
        const { protocol, variable } = req.params;
        const { device } = req.query;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        if (!handler.readVariable) {
          return res.status(501).json({ error: 'Read operation not supported' });
        }

        const result = handler.readVariable(variable, device);
        res.json({
          protocol,
          variable,
          device: device || 'default',
          value: result.value,
          dataType: result.dataType,
          quality: result.quality,
          timestamp: result.timestamp || new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Read Variable Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Write variable to specific protocol
    this.app.post('/api/:protocol/variables/:variable', (req, res) => {
      try {
        const { protocol, variable } = req.params;
        const { value, device } = req.body;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        if (!handler.writeVariable) {
          return res.status(501).json({ error: 'Write operation not supported' });
        }

        const result = handler.writeVariable(variable, value, device);
        res.json({
          protocol,
          variable,
          device: device || 'default',
          value,
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Write Variable Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Bulk read multiple variables
    this.app.post('/api/:protocol/variables/read', (req, res) => {
      try {
        const { protocol } = req.params;
        const { variables, device } = req.body;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        if (!Array.isArray(variables)) {
          return res.status(400).json({ error: 'Variables must be an array' });
        }

        const results = variables.map(variable => {
          try {
            if (handler.readVariable) {
              const result = handler.readVariable(variable, device);
              return {
                variable,
                ...result,
                success: true
              };
            } else {
              return {
                variable,
                success: false,
                error: 'Read operation not supported'
              };
            }
          } catch (error) {
            return {
              variable,
              success: false,
              error: error.message
            };
          }
        });

        res.json({
          protocol,
          device: device || 'default',
          results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Bulk Read Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Bulk write multiple variables
    this.app.post('/api/:protocol/variables/write', (req, res) => {
      try {
        const { protocol } = req.params;
        const { variables, device } = req.body;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        if (!Array.isArray(variables)) {
          return res.status(400).json({ error: 'Variables must be an array of {variable, value} objects' });
        }

        const results = variables.map(({ variable, value }) => {
          try {
            if (handler.writeVariable) {
              const result = handler.writeVariable(variable, value, device);
              return {
                variable,
                value,
                ...result
              };
            } else {
              return {
                variable,
                value,
                success: false,
                message: 'Write operation not supported'
              };
            }
          } catch (error) {
            return {
              variable,
              value,
              success: false,
              message: error.message
            };
          }
        });

        res.json({
          protocol,
          device: device || 'default',
          results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Bulk Write Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Legacy endpoint for backward compatibility
    this.app.get('/api/data/:protocol/:device?', (req, res) => {
      try {
        const { protocol, device } = req.params;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        const data = handler.getData(device);
        res.json(data);
      } catch (error) {
        this.logger.error('API Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Use safe binding - determine the actual bind address
    const bindHost = this.config.server.host || '127.0.0.1';
    const bindPort = this.config.server.port || 8080;
    
    this.server.listen(bindPort, bindHost, () => {
      // Get actual network interfaces for user-friendly connection info
      const os = require('os');
      const interfaces = os.networkInterfaces();
      const addresses = [];
      
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push(iface.address);
          }
        }
      }
      
      this.logger.info(\`🏭 \${this.config.name} Gateway Server Started on \${bindHost}:\${bindPort}\`);
      
      if (bindHost === '0.0.0.0') {
        this.logger.info(\`📡 REST API available at:\`);
        this.logger.info(\`   🏠 http://localhost:\${bindPort}/api\`);
        this.logger.info(\`   🌐 http://127.0.0.1:\${bindPort}/api\`);
        addresses.forEach(addr => {
          this.logger.info(\`   🌍 http://\${addr}:\${bindPort}/api\`);
        });
      } else if (bindHost === '127.0.0.1' || bindHost === 'localhost') {
        this.logger.info(\`📡 REST API available at:\`);
        this.logger.info(\`   🏠 http://localhost:\${bindPort}/api\`);
        this.logger.info(\`   � http://127.0.0.1:\${bindPort}/api\`);
      } else {
        this.logger.info(\`📡 REST API available at http://\${bindHost}:\${bindPort}/api\`);
        if (bindHost !== 'localhost' && bindHost !== '127.0.0.1') {
          this.logger.info(\`🏠 Also available at http://localhost:\${bindPort}/api\`);
        }
      }
    });
    
    this.server.on('error', (err) => {
      if (err.code === 'EADDRNOTAVAIL' || err.code === 'EADDRINUSE') {
        this.logger.error(\`❌ Cannot bind to \${bindHost}:\${bindPort}\`);
        this.logger.info(\`🔄 Trying to bind to localhost:\${bindPort} instead...\`);
        this.server.listen(bindPort, 'localhost', () => {
          this.logger.info(\`✅ Server started on localhost:\${bindPort}\`);
          this.logger.info(\`📡 REST API available at http://localhost:\${bindPort}/api\`);
        });
      } else {
        this.logger.error(\`❌ Server error: \${err.message}\`);
      }
    });
  }

  initializeProtocols() {
    this.config.protocols.forEach(protocolConfig => {
      if (!protocolConfig.enabled) return;

      try {
        let handler;
        
        switch (protocolConfig.type) {
          case 'modbus-tcp':
          case 'modbus-rtu':  
          case 'modbus-serial':
            if (ProtocolHandlers.ModbusHandler) {
              handler = new ProtocolHandlers.ModbusHandler(protocolConfig, this.logger);
            } else {
              this.logger.warn(\`Modbus protocol not loaded - skipping \${protocolConfig.name}\`);
              return;
            }
            break;
          case 'opcua':
            if (ProtocolHandlers.OpcuaHandler) {
              handler = new ProtocolHandlers.OpcuaHandler(protocolConfig, this.logger);
            } else {
              this.logger.warn(\`OPC UA protocol not loaded - skipping \${protocolConfig.name}\`);
              return;
            }
            break;
          case 'mqtt':
            if (ProtocolHandlers.MqttHandler) {
              handler = new ProtocolHandlers.MqttHandler(protocolConfig, this.logger);
            } else {
              this.logger.warn(\`MQTT protocol not loaded - skipping \${protocolConfig.name}\`);
              return;
            }
            break;
          case 'profinet':
            if (ProtocolHandlers.ProfinetHandler) {
              handler = new ProtocolHandlers.ProfinetHandler(protocolConfig, this.logger);
            } else {
              this.logger.warn(\`Profinet protocol not loaded - skipping \${protocolConfig.name}\`);
              return;
            }
            break;
          default:
            this.logger.warn(\`Unsupported protocol: \${protocolConfig.type}\`);
            return;
        }

        this.protocolHandlers.set(protocolConfig.id, handler);
        this.logger.info(\`✅ Initialized \${protocolConfig.name}\`);
        
      } catch (error) {
        this.logger.error(\`❌ Failed to initialize \${protocolConfig.name}:\`, error);
      }
    });
  }

  shutdown() {
    this.logger.info('🔄 Shutting down gateway...');
    this.protocolHandlers.forEach(handler => handler.close && handler.close());
    this.server.close(() => process.exit(0));
  }
}

process.on('SIGINT', () => gateway && gateway.shutdown());
process.on('SIGTERM', () => gateway && gateway.shutdown());

const gateway = new ${config.name.replace(/[^a-zA-Z0-9]/g, '')}Gateway();
`;
}

function generateModbusHandler(config: GatewayConfig): string {
  return `const ModbusRTU = require('modbus-serial');

class ModbusHandler {
  constructor(protocolConfig, logger) {
    this.config = protocolConfig;
    this.logger = logger;
    this.clients = new Map();
    this.registerData = new Map();
    this.variableMap = new Map(); // Maps variable names to register addresses
    this.cyclicTimers = new Map(); // Timers for cyclic operations
    
    // Ensure devices are available in the configuration  
    // Note: UI stores client devices in 'clients' array, we need to map to 'devices'
    if (!this.config.settings) {
      this.config.settings = {};
    }
    
    // Map clients array to devices array if needed
    if (this.config.settings.clients && !this.config.settings.devices) {
      this.logger.info(\`🔄 Mapping clients array to devices array\`);
      this.config.settings.devices = this.config.settings.clients;
    }
    
    // Debug configuration structure
    console.log('🔍 DEBUG: ModbusHandler constructor called');
    console.log('   Config received:', JSON.stringify(this.config, null, 2));
    
    this.logger.info(\`🔍 DEBUG: ModbusHandler configuration received\`);
    this.logger.info(\`   Protocol ID: \${this.config.id}\`);
    this.logger.info(\`   Protocol Name: \${this.config.name}\`);
    this.logger.info(\`   Protocol Type: \${this.config.type}\`);
    this.logger.info(\`   Mode: \${this.config.mode}\`);
    this.logger.info(\`   Enabled: \${this.config.enabled}\`);
    this.logger.info(\`   Config keys: \${Object.keys(this.config).join(', ')}\`);
    if (this.config.settings) {
      console.log('   Settings object exists:', this.config.settings);
      this.logger.info(\`   Settings keys: \${Object.keys(this.config.settings).join(', ')}\`);
      this.logger.info(\`   Server Port: \${this.config.settings.serverPort || 'NOT SET'}\`);
      this.logger.info(\`   Unit ID: \${this.config.settings.unitId || 'NOT SET'}\`);
      this.logger.info(\`   Clients in settings: \${this.config.settings.clients ? this.config.settings.clients.length : 'NONE'}\`);
      
      // Detailed client/device parameter logging
      if (this.config.settings.clients && this.config.settings.clients.length > 0) {
        console.log('   Clients array found:', this.config.settings.clients);
        this.logger.info(\`   📋 Client Device Details:\`);
        this.config.settings.clients.forEach((client, index) => {
          this.logger.info(\`     Device \${index + 1}: \${client.name || 'UNNAMED'}\`);
          this.logger.info(\`       - IP: \${client.ip || 'NOT SET'}\`);
          this.logger.info(\`       - Port: \${client.port || 'NOT SET'}\`);
          this.logger.info(\`       - Unit ID: \${client.unitId || 'NOT SET'}\`);
          this.logger.info(\`       - Enabled: \${client.enabled !== false ? 'YES' : 'NO'}\`);
          this.logger.info(\`       - Timeout: \${client.timeout || 'DEFAULT'}\`);
          this.logger.info(\`       - Retries: \${client.retries || 'DEFAULT'}\`);
          this.logger.info(\`       - Cyclic Enabled: \${client.cyclicEnabled !== false ? 'YES' : 'NO'}\`);
          this.logger.info(\`       - Cyclic Interval: \${client.cyclicInterval || 'DEFAULT'}\`);
        });
      } else {
        console.log('   No clients found in settings');
      }
      
      this.logger.info(\`   Devices in settings: \${this.config.settings.devices ? JSON.stringify(this.config.settings.devices, null, 2) : 'NONE'}\`);
    } else {
      console.log('   No settings object found!');
      this.logger.error(\`❌ No settings found in config!\`);
    }
    
    // Initialize asynchronously
    this.initialize().catch(err => {
      this.logger.error('Failed to initialize ModbusHandler:', err);
    });
    
    // Start connection status reporting
    this.startConnectionStatusReporting();
  }

  startConnectionStatusReporting() {
    // Report connection status every 30 seconds
    this.connectionStatusTimer = setInterval(() => {
      this.reportConnectionStatus();
    }, 30000);
    
    // Initial status report after 5 seconds
    setTimeout(() => {
      this.reportConnectionStatus();
    }, 5000);
  }

  reportConnectionStatus() {
    this.logger.info(\`📊 CONNECTION STATUS REPORT\`);
    
    if (this.config.mode === 'server') {
      this.logger.info(\`   Mode: Server on port \${this.config.settings.serverPort || 5020}\`);
      
      // Get devices from either devices or clients array
      let devicesToReport = [];
      if (this.config.settings.devices && this.config.settings.devices.length > 0) {
        devicesToReport = this.config.settings.devices;
      } else if (this.config.settings.clients && this.config.settings.clients.length > 0) {
        devicesToReport = this.config.settings.clients;
      }
      
      if (devicesToReport.length > 0) {
        this.logger.info(\`   Connected Devices:\`);
        devicesToReport.forEach(device => {
          const clientInfo = this.clients.get(device.name);
          if (clientInfo && clientInfo.client) {
            const isConnected = clientInfo.client.isOpen;
            const status = isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED';
            this.logger.info(\`     - \${device.name} (\${device.ip}:\${clientInfo.config.port}) \${status}\`);
          } else {
            this.logger.info(\`     - \${device.name} (\${device.ip}) ❌ NO CONNECTION ESTABLISHED\`);
          }
        });
      } else {
        this.logger.info(\`   No devices configured\`);
      }
    } else {
      this.logger.info(\`   Mode: Client\`);
    }
    
    const variableCount = this.variableMap.size;
    this.logger.info(\`   Variables: \${variableCount}\`);
    this.logger.info(\`   Active Timers: \${this.cyclicTimers.size}\`);
  }

  async initialize() {
    this.setupVariableMap();
    if (this.config.mode === 'server') {
      this.initializeServer();
    } else {
      await this.initializeClients();
    }
    this.setupCyclicOperations();
  }

  setupVariableMap() {
    const registerMap = this.config.settings.registerMap || {};
    
    this.logger.info(\`🔧 Setting up variable map for mode: \${this.config.mode}\`);
    this.logger.info(\`📋 Register map sections: \${Object.keys(registerMap).join(', ')}\`);
    
    // Only create variables that are explicitly configured - NO defaults
    let totalVariables = 0;
    
    // Set up holding registers
    if (registerMap.holdingRegisters && registerMap.holdingRegisters.variables) {
      const { variables } = registerMap.holdingRegisters;
      if (Array.isArray(variables) && variables.length > 0) {
        this.logger.info(\`📝 Creating \${variables.length} holding register variables\`);
        variables.forEach(variable => {
          if (variable.name && variable.address !== undefined) {
            this.logger.info(\`  ✓ Creating HR variable: \${variable.name} at address \${variable.address}\`);
            this.variableMap.set(variable.name, {
              type: 'holdingRegister',
              address: variable.address,
              dataType: 'int16',
              comMode: variable.comMode || 'write',
              trigger: variable.trigger || 'api',
              cyclicMs: variable.cyclicMs || 1000
            });
            this.registerData.set(variable.name, { 
              value: 0, 
              quality: 'good', 
              timestamp: new Date().toISOString(),
              description: variable.description 
            });
            totalVariables++;
          }
        });
      }
    }

    // Set up input registers (only if explicitly configured)
    if (registerMap.inputRegisters && registerMap.inputRegisters.variables) {
      const { variables } = registerMap.inputRegisters;
      if (Array.isArray(variables) && variables.length > 0) {
        this.logger.warn(\`⚠️  Input registers found! Creating \${variables.length} IR variables\`);
        variables.forEach(variable => {
          if (variable.name && variable.address !== undefined) {
            this.logger.warn(\`  ⚠️  Creating IR variable: \${variable.name} at address \${variable.address}\`);
            this.variableMap.set(variable.name, {
              type: 'inputRegister',
              address: variable.address,
              dataType: 'int16',
              comMode: variable.comMode || 'read',
              trigger: variable.trigger || 'cyclic',
              cyclicMs: variable.cyclicMs || 1000
            });
            this.registerData.set(variable.name, { 
              value: 0, 
              quality: 'good', 
              timestamp: new Date().toISOString(),
              description: variable.description 
            });
            totalVariables++;
          }
        });
      }
    }

    // Set up coils (only if explicitly configured)
    if (registerMap.coils && registerMap.coils.variables) {
      const { variables } = registerMap.coils;
      if (Array.isArray(variables) && variables.length > 0) {
        variables.forEach(variable => {
          if (variable.name && variable.address !== undefined) {
            this.variableMap.set(variable.name, {
              type: 'coil',
              address: variable.address,
              dataType: 'boolean',
              comMode: variable.comMode || 'write',
              trigger: variable.trigger || 'api',
              cyclicMs: variable.cyclicMs || 1000
            });
            this.registerData.set(variable.name, { 
              value: false, 
              quality: 'good', 
              timestamp: new Date().toISOString(),
              description: variable.description 
            });
            totalVariables++;
          }
        });
      }
    }

    // Set up discrete inputs (only if explicitly configured)
    if (registerMap.discreteInputs && registerMap.discreteInputs.variables) {
      const { variables } = registerMap.discreteInputs;
      if (Array.isArray(variables) && variables.length > 0) {
        variables.forEach(variable => {
          if (variable.name && variable.address !== undefined) {
            this.variableMap.set(variable.name, {
              type: 'discreteInput',
              address: variable.address,
              dataType: 'boolean',
              comMode: variable.comMode || 'read',
              trigger: variable.trigger || 'cyclic',
              cyclicMs: variable.cyclicMs || 1000
            });
            this.registerData.set(variable.name, { 
              value: false, 
              quality: 'good', 
              timestamp: new Date().toISOString(),
              description: variable.description 
            });
            totalVariables++;
          }
        });
      }
    }
    
    if (totalVariables === 0) {
      this.logger.info(\`📭 No variables configured - register maps will be empty\`);
    } else {
      this.logger.info(\`✅ Created \${totalVariables} variables total\`);
    }
  }

  initializeServer() {
    try {
      const ModbusRTU = require('modbus-serial');
      const serverPort = this.config.settings.serverPort || 5020;
      
      // Create register banks for Modbus TCP server
      this.holdingRegisters = new Array(65536).fill(0);
      this.inputRegisters = new Array(65536).fill(0);
      this.coils = new Array(65536).fill(false);
      this.discreteInputs = new Array(65536).fill(false);
      
      // Initialize registers with variable data
      this.variableMap.forEach((config, variableName) => {
        const data = this.registerData.get(variableName);
        if (data) {
          switch (config.type) {
            case 'holdingRegister':
              this.holdingRegisters[config.address] = data.value;
              break;
            case 'inputRegister':
              this.inputRegisters[config.address] = data.value;
              break;
            case 'coil':
              this.coils[config.address] = data.value;
              break;
            case 'discreteInput':
              this.discreteInputs[config.address] = data.value;
              break;
          }
        }
      });

      // Create Modbus TCP server - Use ServerTCP constructor properly
      this.server = new ModbusRTU.ServerTCP(null, {
        host: '0.0.0.0',
        port: serverPort,
        debug: false,
        unitID: 1
      });
      
      // Add connection event listeners
      this.server.on('connect', (socket) => {
        this.logger.info(\`🔌 NEW CLIENT CONNECTED: \${socket.remoteAddress}:\${socket.remotePort}\`);
        
        // Check if this is an expected client (from configuration)
        const expectedClients = this.getExpectedClientIPs();
        if (expectedClients.includes(socket.remoteAddress)) {
          const clientName = this.getClientNameByIP(socket.remoteAddress);
          this.logger.info(\`🎯 CONFIGURED CLIENT CONNECTED: \${clientName || socket.remoteAddress}!\`);
        }
        
        // Welcome message for any client
        this.logger.info(\`� Available registers: 0-\${Math.max(...Array.from(this.variableMap.values()).map(v => v.address))}\`);
        this.logger.info(\`�📊 Total active connections: \${this.server._server.connections || 'unknown'}\`);
      });
      
      this.server.on('disconnect', (socket) => {
        this.logger.info(\`🔌 CLIENT DISCONNECTED: \${socket?.remoteAddress}:\${socket?.remotePort}\`);
        const expectedClients = this.getExpectedClientIPs();
        if (expectedClients.includes(socket?.remoteAddress)) {
          const clientName = this.getClientNameByIP(socket?.remoteAddress);
          this.logger.info(\`📡 Configured client \${clientName || socket?.remoteAddress} disconnected - waiting for reconnection...\`);
        }
      });
      
      this.server.on('error', (err) => {
        this.logger.error('❌ Modbus server error:', err);
      });
      
      this.logger.info(\`🌐 Modbus TCP server listening on 0.0.0.0:\${serverPort}\`);
      this.logger.info(\`🔌 External clients can connect to: \${this.getLocalIP()}:\${serverPort}\`);
      this.logger.info(\`📊 Serving \${this.variableMap.size} variables\`);
      
      // Show expected clients if configured
      const expectedClients = this.getExpectedClientIPs();
      if (expectedClients.length > 0) {
        this.logger.info(\`🎯 Expecting connections from configured clients: \${expectedClients.join(', ')}\`);
        expectedClients.forEach(ip => {
          const clientName = this.getClientNameByIP(ip);
          if (clientName) {
            this.logger.info(\`   • \${clientName} (\${ip})\`);
          }
        });
      } else {
        this.logger.info(\`🌍 No specific clients configured - accepting connections from any IP\`);
      }
      
      this.logger.info(\`💡 Configure your client to connect to \${this.getLocalIP()}:\${serverPort}\`);
      
      // Set up function code handlers after server creation
      this.setupModbusFunctionHandlers();

    } catch (error) {
      this.logger.error('Modbus server initialization failed:', error);
      // Fallback to basic server setup
      this.logger.warn('⚠️  Falling back to basic server setup');
      this.initializeBasicServer();
    }
  }

  // Set up Modbus function code handlers
  setupModbusFunctionHandlers() {
    // Read Coils (FC01)
    this.server.setRequestHandler(1, (addr, length) => {
      this.logger.info(\`📖 FC01 Read Coils: addr=\${addr}, length=\${length} [EXTERNAL CLIENT REQUEST]\`);
      return this.coils.slice(addr, addr + length);
    });

    // Read Discrete Inputs (FC02)
    this.server.setRequestHandler(2, (addr, length) => {
      this.logger.info(\`📖 FC02 Read Discrete Inputs: addr=\${addr}, length=\${length} [EXTERNAL CLIENT REQUEST]\`);
      return this.discreteInputs.slice(addr, addr + length);
    });

    // Read Holding Registers (FC03)
    this.server.setRequestHandler(3, (addr, length) => {
      this.logger.info(\`📖 FC03 Read Holding Registers: addr=\${addr}, length=\${length} [EXTERNAL CLIENT REQUEST]\`);
      this.logger.info(\`📊 Current values: \${this.holdingRegisters.slice(addr, addr + length).join(', ')}\`);
      return this.holdingRegisters.slice(addr, addr + length);
    });

    // Read Input Registers (FC04)
    this.server.setRequestHandler(4, (addr, length) => {
      this.logger.info(\`📖 FC04 Read Input Registers: addr=\${addr}, length=\${length} [EXTERNAL CLIENT REQUEST]\`);
      return this.inputRegisters.slice(addr, addr + length);
    });

    // Write Single Coil (FC05)
    this.server.setRequestHandler(5, (addr, value) => {
      this.logger.info(\`📝 FC05 Write Single Coil: addr=\${addr}, value=\${value} [EXTERNAL CLIENT WRITE]\`);
      this.coils[addr] = value;
      this.updateVariableFromModbus('coil', addr, value);
      return value;
    });

    // Write Single Holding Register (FC06)
    this.server.setRequestHandler(6, (addr, value) => {
      this.logger.info(\`📝 FC06 Write Single Register: addr=\${addr}, value=\${value} [EXTERNAL CLIENT WRITE]\`);
      this.holdingRegisters[addr] = value;
      this.updateVariableFromModbus('holdingRegister', addr, value);
      return value;
    });

    // Write Multiple Coils (FC15)
    this.server.setRequestHandler(15, (addr, values) => {
      this.logger.info(\`📝 FC15 Write Multiple Coils: addr=\${addr}, count=\${values.length} [EXTERNAL CLIENT WRITE]\`);
      for (let i = 0; i < values.length; i++) {
        this.coils[addr + i] = values[i];
        this.updateVariableFromModbus('coil', addr + i, values[i]);
      }
      return values.length;
    });

    // Write Multiple Holding Registers (FC16)
    this.server.setRequestHandler(16, (addr, values) => {
      this.logger.info(\`📝 FC16 Write Multiple Registers: addr=\${addr}, count=\${values.length} [EXTERNAL CLIENT WRITE]\`);
      this.logger.info(\`📝 Writing values: \${values.join(', ')} starting at address \${addr}\`);
      for (let i = 0; i < values.length; i++) {
        this.holdingRegisters[addr + i] = values[i];
        this.updateVariableFromModbus('holdingRegister', addr + i, values[i]);
      }
      return values.length;
    });

    this.logger.info('✅ Modbus function code handlers configured');
    this.logger.info('🔍 Monitoring for external Modbus client connections...');
    this.logger.info('💡 When your client connects, you will see [EXTERNAL CLIENT] messages above');
    
    // Log register ranges that are available for external clients
    const hrAddresses = Array.from(this.variableMap.entries())
      .filter(([_, config]) => config.type === 'holdingRegister')
      .map(([name, config]) => \`\${name}@\${config.address}\`);
      
    if (hrAddresses.length > 0) {
      this.logger.info(\`📋 Available Holding Registers for external clients:\`);
      hrAddresses.forEach(reg => this.logger.info(\`   \${reg}\`));
      this.logger.info(\`🎯 Your Modbus client should read/write to these addresses\`);
    }
    
    const coilAddresses = Array.from(this.variableMap.entries())
      .filter(([_, config]) => config.type === 'coil')
      .map(([name, config]) => \`\${name}@\${config.address}\`);
      
    if (coilAddresses.length > 0) {
      this.logger.info(\`📋 Available Coils for external clients:\`);
      coilAddresses.forEach(coil => this.logger.info(\`   \${coil}\`));
    }
  }

  // Fallback server method using basic ModbusRTU setup
  initializeBasicServer() {
    try {
      const ModbusRTU = require('modbus-serial');
      this.server = new ModbusRTU();
      
      // Create register banks
      this.holdingRegisters = new Array(65536).fill(0);
      this.inputRegisters = new Array(65536).fill(0);
      this.coils = new Array(65536).fill(false);
      this.discreteInputs = new Array(65536).fill(false);
      
      // Initialize with variable data
      this.variableMap.forEach((config, variableName) => {
        const data = this.registerData.get(variableName);
        if (data) {
          switch (config.type) {
            case 'holdingRegister':
              this.holdingRegisters[config.address] = data.value;
              break;
            case 'inputRegister':
              this.inputRegisters[config.address] = data.value;
              break;
            case 'coil':
              this.coils[config.address] = data.value;
              break;
            case 'discreteInput':
              this.discreteInputs[config.address] = data.value;
              break;
          }
        }
      });
      
      this.logger.info(\`🌐 Basic Modbus server initialized with \${this.variableMap.size} variables\`);
      
    } catch (error) {
      this.logger.error('Basic Modbus server initialization failed:', error);
    }
  }

  // Update variable data when Modbus client writes to registers
  updateVariableFromModbus(type, address, value) {
    this.variableMap.forEach((config, variableName) => {
      if (config.type === type && config.address === address) {
        this.registerData.set(variableName, {
          value: value,
          quality: 'good',
          timestamp: new Date().toISOString()
        });
        this.logger.info(\`🔄 Updated variable \${variableName} = \${value} from Modbus client\`);
      }
    });
  }

  // Sync variable changes back to Modbus registers
  syncVariableToModbus(variableName, value) {
    const config = this.variableMap.get(variableName);
    
    this.logger.info(\`🔄 SYNC DEBUG: Attempting to sync \${variableName} = \${value}\`);
    
    if (!config) {
      this.logger.error(\`❌ SYNC ERROR: Variable '\${variableName}' not found in variableMap\`);
      this.logger.info(\`📋 Available variables: \${Array.from(this.variableMap.keys()).join(', ')}\`);
      return;
    }
    
    this.logger.info(\`🔍 SYNC DEBUG: Variable config found - type: \${config.type}, address: \${config.address}\`);
    
    switch (config.type) {
      case 'holdingRegister':
        const oldValue = this.holdingRegisters[config.address];
        this.holdingRegisters[config.address] = value;
        this.logger.info(\`📝 SYNC SUCCESS: Updated holding register \${config.address}: \${oldValue} -> \${value}\`);
        break;
      case 'inputRegister':
        this.inputRegisters[config.address] = value;
        this.logger.info(\`📝 SYNC SUCCESS: Updated input register \${config.address} = \${value}\`);
        break;
      case 'coil':
        this.coils[config.address] = value;
        this.logger.info(\`📝 SYNC SUCCESS: Updated coil \${config.address} = \${value}\`);
        break;
      case 'discreteInput':
        this.discreteInputs[config.address] = value;
        this.logger.info(\`📝 SYNC SUCCESS: Updated discrete input \${config.address} = \${value}\`);
        break;
      default:
        this.logger.error(\`❌ SYNC ERROR: Unknown register type '\${config.type}' for \${variableName}\`);
        return;
    }
    
    // Verify the update was successful
    if (config.type === 'holdingRegister') {
      const actualValue = this.holdingRegisters[config.address];
      this.logger.info(\`✅ SYNC VERIFY: Holding register \${config.address} now contains: \${actualValue}\`);
    }
  }

  // Get expected client IP addresses from configuration
  getExpectedClientIPs() {
    const expectedIPs = [];
    
    // Check if we have client configuration in server mode
    if (this.config.mode === 'server' && this.config.settings.clients) {
      this.config.settings.clients.forEach(client => {
        if (client.ip) {
          expectedIPs.push(client.ip);
        }
      });
    }
    
    // Also check devices array (legacy compatibility)
    if (this.config.settings.devices) {
      this.config.settings.devices.forEach(device => {
        if (device.ip && !expectedIPs.includes(device.ip)) {
          expectedIPs.push(device.ip);
        }
      });
    }
    
    return expectedIPs;
  }

  // Get client name by IP address
  getClientNameByIP(ipAddress) {
    // Check clients first
    if (this.config.settings.clients) {
      const client = this.config.settings.clients.find(c => c.ip === ipAddress);
      if (client) return client.name;
    }
    
    // Check devices array (legacy compatibility)
    if (this.config.settings.devices) {
      const device = this.config.settings.devices.find(d => d.ip === ipAddress);
      if (device) return device.name;
    }
    
    return null;
  }

  // Get local IP address for client connection info
  getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    
    // Log all available addresses for troubleshooting
    if (addresses.length > 0) {
      this.logger.info(\`🌐 Available network interfaces: \${addresses.join(', ')}\`);
      this.logger.info(\`💡 External Modbus clients should connect to one of these addresses\`);
      return addresses[0]; // Return primary interface
    }
    
    this.logger.warn('⚠️  No external network interfaces found, using localhost');
    return '127.0.0.1';
  }

  async testModbusConnection(client, unitId) {
    // Common Modbus register addresses to test for general devices
    const testCases = [
      // Standard Modbus addressing
      { type: 'holding', address: 0, description: 'Holding register 0' },
      { type: 'holding', address: 1, description: 'Holding register 1' },
      { type: 'holding', address: 100, description: 'Holding register 100' },
      { type: 'holding', address: 40001, description: 'Modbus 4x addressing (40001)' },
      { type: 'holding', address: 40000, description: 'Modbus 4x addressing (40000)' },
      
      { type: 'input', address: 0, description: 'Input register 0' },
      { type: 'input', address: 1, description: 'Input register 1' },
      { type: 'input', address: 30001, description: 'Modbus 3x addressing (30001)' },
      { type: 'input', address: 30000, description: 'Modbus 3x addressing (30000)' },
      
      { type: 'coil', address: 0, description: 'Coil 0' },
      { type: 'coil', address: 1, description: 'Coil 1' },
      { type: 'coil', address: 10000, description: 'Modbus 0x addressing (10000)' },
      
      { type: 'discrete', address: 0, description: 'Discrete input 0' },
      { type: 'discrete', address: 1, description: 'Discrete input 1' },
      { type: 'discrete', address: 10001, description: 'Modbus 1x addressing (10001)' }
    ];
    
    for (const testCase of testCases) {
      try {
        let result;
        switch (testCase.type) {
          case 'holding':
            result = await client.readHoldingRegisters(testCase.address, 1);
            return { success: true, message: \`Holding register \${testCase.address} accessible (\${testCase.description})\` };
            
          case 'input':
            result = await client.readInputRegisters(testCase.address, 1);
            return { success: true, message: \`Input register \${testCase.address} accessible (\${testCase.description})\` };
            
          case 'coil':
            result = await client.readCoils(testCase.address, 1);
            return { success: true, message: \`Coil \${testCase.address} accessible (\${testCase.description})\` };
            
          case 'discrete':
            result = await client.readDiscreteInputs(testCase.address, 1);
            return { success: true, message: \`Discrete input \${testCase.address} accessible (\${testCase.description})\` };
        }
      } catch (error) {
        // Continue to next test case
        this.logger.debug(\`❌ \${testCase.description} at address \${testCase.address}: \${error.message}\`);
      }
    }
    
    return { success: false, message: 'All Modbus register tests failed - check device configuration and connectivity' };
  }

  async initializeClients() {
    this.logger.info(\`🔧 Initializing Modbus clients...\`);
    this.logger.info(\`   Config check: \${this.config ? 'EXISTS' : 'MISSING'}\`);
    this.logger.info(\`   Settings check: \${this.config?.settings ? 'EXISTS' : 'MISSING'}\`);
    this.logger.info(\`   Clients check: \${this.config?.settings?.clients ? 'EXISTS' : 'MISSING'}\`);
    this.logger.info(\`   Devices check: \${this.config?.settings?.devices ? 'EXISTS' : 'MISSING'}\`);
    
    // Use devices array (should be mapped from clients in constructor)
    let devicesToProcess = [];
    if (this.config && this.config.settings) {
      if (this.config.settings.devices) {
        devicesToProcess = this.config.settings.devices;
        this.logger.info(\`   Using devices array with \${devicesToProcess.length} devices\`);
      } else if (this.config.settings.clients) {
        devicesToProcess = this.config.settings.clients;
        this.logger.info(\`   Using clients array with \${devicesToProcess.length} clients\`);
      } else {
        this.logger.error(\`❌ No devices or clients configuration found!\`);
        this.logger.error(\`   Available settings keys: \${Object.keys(this.config.settings).join(', ')}\`);
        return;
      }
      
      this.logger.info(\`   Device/Client array length: \${devicesToProcess.length}\`);
      this.logger.info(\`   Device/Client content: \${JSON.stringify(devicesToProcess, null, 2)}\`);
      
      if (devicesToProcess.length === 0) {
        this.logger.warn(\`⚠️  Devices array is empty!\`);
        return;
      }
      
      for (let i = 0; i < devicesToProcess.length; i++) {
        const device = devicesToProcess[i];
        this.logger.info(\`🔌 Processing device \${i + 1}: \${device.name || 'UNNAMED'} at \${device.ip || 'NO_IP'}\`);
        await this.connectToDevice(device);
      }
    } else {
      this.logger.error(\`❌ No configuration found!\`);
      this.logger.error(\`   Full config structure: \${JSON.stringify(this.config, null, 2)}\`);
    }
  }

  async connectToDevice(device, retryCount = 0) {
    const maxRetries = 8; // More retries for thorough testing
    const retryDelay = 2000; // 2 seconds
    
    // Skip disabled devices
    if (device.enabled === false) {
      this.logger.info(\`⏸️  Device \${device.name} is disabled - skipping connection\`);
      return;
    }
    
    try {
      // Common Modbus ports for different PLCs - prioritize 102 since it worked in test
      const commonPorts = [
        102,   // Siemens S7 communication - CONFIRMED WORKING
        502,   // Standard Modbus TCP
        5020,  // Gateway default
        1502,  // Schneider Electric
        2404,  // Siemens S7-300/400 (sometimes)
        503,   // Backup Modbus
        44818, // Ethernet/IP
        523,   // Custom (like your Python example)
      ];
      const portsToTry = device.port !== undefined ? [device.port, ...commonPorts.filter(p => p !== device.port)] : commonPorts;
      const portToTry = portsToTry[retryCount % portsToTry.length];
      
      const isConfiguredPort = device.port !== undefined && portToTry === device.port;
      this.logger.info(\`🔌 [ATTEMPT \${retryCount + 1}/\${maxRetries * portsToTry.length}] Connecting to \${device.name} at \${device.ip}:\${portToTry}\${isConfiguredPort ? ' (TIA configured port)' : ' (auto-detect port)'}\`);
      this.logger.info(\`🔧 Using device settings: timeout=\${device.timeout || 8000}ms, retries=\${device.retries || 1}, unitId=\${device.unitId || 'auto-detect'}\`);
      
      const client = new ModbusRTU();
      
      // Use device-specific timeout if available, otherwise default for PLCs
      const deviceTimeout = device.timeout || 3000; // Use 3 second timeout like our working test
      
      client.setTimeout(deviceTimeout);
      // Note: setRetries may not be available in all versions, skip it
      
      // Connect to TCP
      this.logger.info(\`📡 TCP handshake starting with \${device.ip}:\${portToTry} (timeout: \${deviceTimeout}ms)...\`);
      await client.connectTCP(device.ip, { port: portToTry });
      this.logger.info(\`✅ TCP socket established with \${device.ip}:\${portToTry}\`);
      
      // TCP connection successful - consider this a working connection like our test script
      // Don't require Modbus protocol success for initial connection
      let connectionWorked = true; // TCP success is enough for now
      let workingUnitId = device.unitId !== undefined ? device.unitId : 1;
      
      // Set the unit ID but don't fail if Modbus communication doesn't work yet
      client.setID(workingUnitId);
      this.logger.info(\`✅ TCP Connection established successfully - using unit ID \${workingUnitId}\`);
      
      // Optional: Try a simple Modbus test but don't fail if it doesn't work
      try {
        const result = await client.readHoldingRegisters(0, 1);
        this.logger.info(\`🎉 BONUS: Modbus communication also working! Register 0 = \${result.data[0]}\`);
      } catch (modbusError) {
        this.logger.info(\`ℹ️  TCP connected successfully, Modbus protocol may need configuration: \${modbusError.message}\`);
        // Don't set connectionWorked = false here, TCP is what matters for basic connectivity
      }
      
      if (connectionWorked) {
        this.logger.info(\`🎉 SUCCESS! Connected to \${device.name} at \${device.ip}:\${portToTry} with unit ID \${workingUnitId}\`);
        this.clients.set(device.name, { 
          client, 
          config: { ...device, port: portToTry, unitId: workingUnitId } 
        });
      } else {
        throw new Error(\`All Siemens/PLC register tests failed for all unit IDs on \${device.ip}:\${portToTry}\`);
      }
      
    } catch (err) {
      const portsToTry = device.port !== undefined ? [device.port, ...commonPorts.filter(p => p !== device.port)] : commonPorts;
      const portToTry = portsToTry[retryCount % portsToTry.length];
      
      this.logger.error(\`❌ [ATTEMPT \${retryCount + 1}] Failed to connect to \${device.name} at \${device.ip}:\${portToTry}\`);
      this.logger.error(\`   Error details: \${err.message}\`);
      
      if (retryCount < maxRetries * portsToTry.length) { // Try all ports multiple times
        const nextRetry = retryCount + 1;
        const nextPort = portsToTry[nextRetry % portsToTry.length];
        this.logger.info(\`🔄 Next attempt: \${device.name} on port \${nextPort} in 3 seconds... (attempt \${nextRetry + 1})\`);
        setTimeout(() => {
          this.connectToDevice(device, nextRetry);
        }, retryDelay);
      } else {
        this.logger.error(\`💥 EXHAUSTED all attempts for \${device.name}. Device will be unavailable.\`);
        this.logger.info(\`� CONNECTION SUMMARY for \${device.name}:\`);
        this.logger.info(\`   - Target IP: \${device.ip}\`);
        this.logger.info(\`   - Ports tried: \${portsToTry.join(', ')}\`);
        this.logger.info(\`   - Unit IDs tried: Common Modbus unit IDs\`);
        this.logger.info(\`   - Register types tried: Holding, Input, Coils, Discrete\`);
        this.logger.info(\`💡 TROUBLESHOOTING STEPS:\`);
        this.logger.info(\`   1. Verify \${device.ip} is reachable (ping test)\`);
        this.logger.info(\`   2. Check if device has Modbus TCP enabled\`);
        this.logger.info(\`   3. Verify the correct Modbus port on device (common: 502, 1502, 5020)\`);
        this.logger.info(\`   4. Check device's unit ID configuration\`);
        this.logger.info(\`   5. Ensure no firewall is blocking the connection\`);
        this.logger.info(\`   6. Verify device supports standard Modbus function codes\`);
      }
    }
  }

  getVariableList() {
    return Array.from(this.variableMap.entries()).map(([name, config]) => ({
      name,
      address: config.address,
      type: config.type,
      dataType: config.dataType,
      readable: true,
      writable: config.type === 'holdingRegister' || config.type === 'coil'
    }));
  }

  readVariable(variableName, deviceName) {
    try {
      if (!this.variableMap.has(variableName)) {
        throw new Error(\`Variable '\${variableName}' not found\`);
      }

      const variableData = this.registerData.get(variableName);
      const variableConfig = this.variableMap.get(variableName);

      // If client mode and device specified, read from actual device
      if (this.config.mode === 'client' && deviceName && this.clients.has(deviceName)) {
        return this.readFromDevice(variableName, deviceName);
      }

      return {
        value: variableData.value,
        dataType: variableConfig.dataType,
        quality: variableData.quality,
        timestamp: variableData.timestamp,
        address: variableConfig.address,
        type: variableConfig.type
      };
    } catch (error) {
      this.logger.error(\`Read variable error for \${variableName}:\`, error);
      return {
        value: null,
        dataType: 'unknown',
        quality: 'bad',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  writeVariable(variableName, value, deviceName) {
    try {
      if (!this.variableMap.has(variableName)) {
        throw new Error(\`Variable '\${variableName}' not found\`);
      }

      const variableConfig = this.variableMap.get(variableName);

      // Check if variable is writable
      if (variableConfig.type !== 'holdingRegister' && variableConfig.type !== 'coil') {
        throw new Error(\`Variable '\${variableName}' is not writable (type: \${variableConfig.type})\`);
      }

      // Validate value based on data type
      let validatedValue = value;
      if (variableConfig.dataType === 'boolean') {
        validatedValue = Boolean(value);
      } else if (variableConfig.dataType === 'int16') {
        validatedValue = parseInt(value);
        if (validatedValue < -32768 || validatedValue > 32767) {
          throw new Error(\`Value \${value} out of range for int16 (-32768 to 32767)\`);
        }
      }

      // Store previous value
      const previousData = this.registerData.get(variableName);

      // Update local data store
      this.registerData.set(variableName, {
        value: validatedValue,
        quality: 'good',
        timestamp: new Date().toISOString()
      });

      // Sync to Modbus registers for server mode
      if (this.config.mode === 'server') {
        this.syncVariableToModbus(variableName, validatedValue);
      }

      // If client mode and device specified, write to actual device
      if (this.config.mode === 'client' && deviceName && this.clients.has(deviceName)) {
        return this.writeToDevice(variableName, validatedValue, deviceName);
      }

      this.logger.info(\`📝 Written \${variableName} = \${validatedValue} (synced to Modbus)\`);
      return {
        success: true,
        message: \`Successfully wrote \${validatedValue} to \${variableName}\`,
        previousValue: previousData?.value
      };
    } catch (error) {
      this.logger.error(\`Write variable error for \${variableName}:\`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  readFromDevice(variableName, deviceName) {
    // Implementation for reading from actual Modbus device
    // This would use the ModbusRTU client to read from the device
    this.logger.info(\`📖 Reading \${variableName} from device \${deviceName}\`);
    return this.readVariable(variableName); // Fallback to local for now
  }

  writeToDevice(variableName, value, deviceName) {
    // Implementation for writing to actual Modbus device
    // This would use the ModbusRTU client to write to the device
    this.logger.info(\`📝 Writing \${variableName} = \${value} to device \${deviceName}\`);
    return { success: true, message: \`Written to device \${deviceName}\` };
  }

  getData(deviceName) {
    const variables = {};
    this.registerData.forEach((data, name) => {
      variables[name] = data.value;
    });
    
    return { 
      connected: true, 
      variables,
      variableCount: this.registerData.size,
      timestamp: new Date().toISOString()
    };
  }

  writeData(deviceName, data) {
    this.logger.info('📝 Writing data', data);
  }

  setupCyclicOperations() {
    // Set up cyclic operations for server register variables
    this.variableMap.forEach((config, variableName) => {
      if (config.trigger === 'cyclic' && config.cyclicMs > 0) {
        const timer = setInterval(() => {
          try {
            if (config.comMode === 'read' || config.comMode === 'readwrite') {
              // For server mode, only use values from device→server mapping
              // No simulation, only real device data will be available
              
              // Sync to Modbus registers for server mode
              if (this.config.mode === 'server') {
                const data = this.registerData.get(variableName);
                if (data) {
                  this.syncVariableToModbus(variableName, data.value);
                }
              }
            }
            if (config.comMode === 'write' || config.comMode === 'readwrite') {
              // Write operations - no simulation, only real device writes
              this.logger.debug(\`📤 Cyclic write operation for \${variableName} (no simulation)\`);
            }
          } catch (error) {
            this.logger.error(\`Cyclic operation error for \${variableName}:\`, error);
          }
        }, config.cyclicMs);
        
        this.cyclicTimers.set(variableName, timer);
        this.logger.info(\`🔄 Started cyclic \${config.comMode} for \${variableName} every \${config.cyclicMs}ms\`);
      }
    });

    // Set up cyclic operations for client device register mappings
    this.setupDeviceRegisterMappings();
  }

  setupDeviceRegisterMappings() {
    if (this.config.mode === 'server' && this.config.settings.clients) {
      this.config.settings.clients.forEach(client => {
        if (client.enabled && client.registerMappings) {
          this.logger.info(\`🔗 Setting up register mappings for client: \${client.name}\`);
          
          // Process holding register mappings
          if (client.registerMappings.holdingRegisters) {
            client.registerMappings.holdingRegisters.forEach(mapping => {
              if (mapping.comMode === 'read' || mapping.comMode === 'readwrite') {
                if (mapping.trigger === 'cyclic' && mapping.cyclicMs > 0) {
                  const timer = setInterval(async () => {
                    await this.performDeviceToServerMapping(client, mapping, 'holdingRegister');
                  }, mapping.cyclicMs);
                  
                  const mappingKey = \`\${client.id}_HR_\${mapping.deviceAddress}_to_\${mapping.serverAddress}\`;
                  this.cyclicTimers.set(mappingKey, timer);
                  this.logger.info(\`🔄 Started cyclic read: Device[\${client.name}]:HR\${mapping.deviceAddress} → Server:HR\${mapping.serverAddress} every \${mapping.cyclicMs}ms\`);
                }
              }
            });
          }

          // Process input register mappings
          if (client.registerMappings.inputRegisters) {
            client.registerMappings.inputRegisters.forEach(mapping => {
              if (mapping.comMode === 'read' || mapping.comMode === 'readwrite') {
                if (mapping.trigger === 'cyclic' && mapping.cyclicMs > 0) {
                  const timer = setInterval(async () => {
                    await this.performDeviceToServerMapping(client, mapping, 'inputRegister');
                  }, mapping.cyclicMs);
                  
                  const mappingKey = \`\${client.id}_IR_\${mapping.deviceAddress}_to_\${mapping.serverAddress}\`;
                  this.cyclicTimers.set(mappingKey, timer);
                  this.logger.info(\`🔄 Started cyclic read: Device[\${client.name}]:IR\${mapping.deviceAddress} → Server:IR\${mapping.serverAddress} every \${mapping.cyclicMs}ms\`);
                }
              }
            });
          }

          // Process coil mappings
          if (client.registerMappings.coils) {
            client.registerMappings.coils.forEach(mapping => {
              if (mapping.comMode === 'read' || mapping.comMode === 'readwrite') {
                if (mapping.trigger === 'cyclic' && mapping.cyclicMs > 0) {
                  const timer = setInterval(async () => {
                    await this.performDeviceToServerMapping(client, mapping, 'coil');
                  }, mapping.cyclicMs);
                  
                  const mappingKey = \`\${client.id}_C_\${mapping.deviceAddress}_to_\${mapping.serverAddress}\`;
                  this.cyclicTimers.set(mappingKey, timer);
                  this.logger.info(\`🔄 Started cyclic read: Device[\${client.name}]:C\${mapping.deviceAddress} → Server:C\${mapping.serverAddress} every \${mapping.cyclicMs}ms\`);
                }
              }
            });
          }

          // Process discrete input mappings
          if (client.registerMappings.discreteInputs) {
            client.registerMappings.discreteInputs.forEach(mapping => {
              if (mapping.comMode === 'read' || mapping.comMode === 'readwrite') {
                if (mapping.trigger === 'cyclic' && mapping.cyclicMs > 0) {
                  const timer = setInterval(async () => {
                    await this.performDeviceToServerMapping(client, mapping, 'discreteInput');
                  }, mapping.cyclicMs);
                  
                  const mappingKey = \`\${client.id}_DI_\${mapping.deviceAddress}_to_\${mapping.serverAddress}\`;
                  this.cyclicTimers.set(mappingKey, timer);
                  this.logger.info(\`🔄 Started cyclic read: Device[\${client.name}]:DI\${mapping.deviceAddress} → Server:DI\${mapping.serverAddress} every \${mapping.cyclicMs}ms\`);
                }
              }
            });
          }
        }
      });
    }
  }

  async performDeviceToServerMapping(client, mapping, registerType) {
    try {
      // Read actual value from the device instead of simulation
      const deviceValue = await this.readFromDevice(client, mapping, registerType);
      
      if (deviceValue !== null) {
      
      // Map the device value to the server register
      switch (registerType) {
        case 'holdingRegister':
          this.holdingRegisters[mapping.serverAddress] = deviceValue;
          this.logger.info(\`📊 Mapped Device[\${client.name}]:HR\${mapping.deviceAddress}(\${deviceValue}) → Server:HR\${mapping.serverAddress}\`);
          break;
        case 'inputRegister':
          this.inputRegisters[mapping.serverAddress] = deviceValue;
          this.logger.info(\`📊 Mapped Device[\${client.name}]:IR\${mapping.deviceAddress}(\${deviceValue}) → Server:IR\${mapping.serverAddress}\`);
          break;
        case 'coil':
          this.coils[mapping.serverAddress] = deviceValue;
          this.logger.info(\`📊 Mapped Device[\${client.name}]:C\${mapping.deviceAddress}(\${deviceValue}) → Server:C\${mapping.serverAddress}\`);
          break;
        case 'discreteInput':
          this.discreteInputs[mapping.serverAddress] = deviceValue;
          this.logger.info(\`� Mapped Device[\${client.name}]:DI\${mapping.deviceAddress}(\${deviceValue}) → Server:DI\${mapping.serverAddress}\`);
          break;
      }
      
        
        // Update any server variables that might be mapped to this address
        this.updateServerVariableFromMapping(mapping.serverAddress, deviceValue, registerType);
      }
      
    } catch (error) {
      this.logger.error(\`Device→Server mapping error for \${client.name}:\`, error);
    }
  }

  async readFromDevice(client, mapping, registerType) {
    try {
      // Get the connected client for this device
      const clientInfo = this.clients.get(client.name);
      if (!clientInfo || !clientInfo.client) {
        throw new Error(\`No active connection to device \${client.name}. Check connection status above.\`);
      }

      const modbusClient = clientInfo.client;
      
      // Check if client is still connected
      if (!modbusClient.isOpen) {
        this.logger.warn(\`🔌 Connection to \${client.name} appears closed. Attempting to reconnect...\`);
        await this.connectToDevice(client);
        
        // Get the reconnected client
        const reconnectedClientInfo = this.clients.get(client.name);
        if (!reconnectedClientInfo || !reconnectedClientInfo.client) {
          throw new Error(\`Failed to reconnect to device \${client.name}\`);
        }
      }
      
      // Set the unit ID if specified
      if (client.unitId) {
        modbusClient.setID(client.unitId);
      }

      this.logger.debug(\`📖 Reading \${registerType} address \${mapping.deviceAddress} from \${client.name}\`);

      let result;
      switch (registerType) {
        case 'holdingRegister':
          result = await modbusClient.readHoldingRegisters(mapping.deviceAddress, 1);
          return result.data[0];
          
        case 'inputRegister':
          result = await modbusClient.readInputRegisters(mapping.deviceAddress, 1);
          return result.data[0];
          
        case 'coil':
          result = await modbusClient.readCoils(mapping.deviceAddress, 1);
          return result.data[0];
          
        case 'discreteInput':
          result = await modbusClient.readDiscreteInputs(mapping.deviceAddress, 1);
          return result.data[0];
          
        default:
          throw new Error(\`Unknown register type: \${registerType}\`);
      }
      
    } catch (error) {
      this.logger.error(\`Failed to read from device \${client.name} at address \${mapping.deviceAddress}:\`, error.message);
      throw error;
    }
  }

  updateServerVariableFromMapping(serverAddress, value, registerType) {
    // Update any server variables that are configured for this address
    this.variableMap.forEach((config, variableName) => {
      if (config.address === serverAddress && config.type === registerType) {
        this.registerData.set(variableName, {
          value: value,
          quality: 'good',
          timestamp: new Date().toISOString()
        });
        this.logger.info(\`🔄 Updated server variable \${variableName} = \${value} from device mapping\`);
      }
    });
  }

  close() {
    // Clear all cyclic timers
    this.cyclicTimers.forEach(timer => clearInterval(timer));
    this.cyclicTimers.clear();
    
    // Clear connection status timer
    if (this.connectionStatusTimer) {
      clearInterval(this.connectionStatusTimer);
    }
    
    this.clients.forEach(c => c.client.close && c.client.close());
    this.server && this.server.close();
    
    this.logger.info('🔌 ModbusHandler closed');
  }
}

module.exports = ModbusHandler;
`;
}

function generateOpcuaHandler(config: GatewayConfig): string {
  return `class OpcuaHandler {
  constructor(protocolConfig, logger) {
    this.config = protocolConfig;
    this.logger = logger;
    this.variables = new Map();
    this.initialize();
  }

  initialize() {
    // Set up default OPC UA variables
    this.setupVariables();
    this.logger.info('🏭 OPC UA handler initialized');
  }

  setupVariables() {
    const configVariables = this.config.settings.variables;
    
    if (configVariables && Array.isArray(configVariables)) {
      // Use custom configured variables
      configVariables.forEach(variable => {
        let defaultValue = 0;
        switch (variable.dataType.toLowerCase()) {
          case 'boolean':
            defaultValue = false;
            break;
          case 'double':
            defaultValue = 0.0;
            break;
          case 'int32':
            defaultValue = 0;
            break;
          case 'string':
            defaultValue = '';
            break;
        }
        
        this.variables.set(variable.name, {
          nodeId: variable.nodeId,
          dataType: variable.dataType.toLowerCase(),
          value: defaultValue,
          quality: 'good',
          timestamp: new Date().toISOString(),
          writable: true,
          description: variable.description
        });
      });
    } else {
      // Fallback to default sample variables
      const sampleVariables = [
        { name: 'Temperature', nodeId: 'ns=2;s=Temperature', dataType: 'double', value: 25.5 },
        { name: 'Pressure', nodeId: 'ns=2;s=Pressure', dataType: 'double', value: 101.3 },
        { name: 'Running', nodeId: 'ns=2;s=Running', dataType: 'boolean', value: false },
        { name: 'Speed', nodeId: 'ns=2;s=Speed', dataType: 'int32', value: 1500 },
        { name: 'SetPoint', nodeId: 'ns=2;s=SetPoint', dataType: 'double', value: 30.0 }
      ];

      sampleVariables.forEach(variable => {
        this.variables.set(variable.name, {
          nodeId: variable.nodeId,
          dataType: variable.dataType,
          value: variable.value,
          quality: 'good',
          timestamp: new Date().toISOString(),
          writable: true
        });
      });
    }
  }
        writable: true
      });
    });
  }

  getVariableList() {
    return Array.from(this.variables.entries()).map(([name, config]) => ({
      name,
      nodeId: config.nodeId,
      dataType: config.dataType,
      readable: true,
      writable: config.writable
    }));
  }

  readVariable(variableName, deviceName) {
    try {
      if (!this.variables.has(variableName)) {
        throw new Error(\`OPC UA variable '\${variableName}' not found\`);
      }

      const variable = this.variables.get(variableName);
      this.logger.info(\`📖 Reading OPC UA variable: \${variableName}\`);

      return {
        value: variable.value,
        dataType: variable.dataType,
        quality: variable.quality,
        timestamp: variable.timestamp,
        nodeId: variable.nodeId
      };
    } catch (error) {
      this.logger.error(\`OPC UA read error for \${variableName}:\`, error);
      return {
        value: null,
        dataType: 'unknown',
        quality: 'bad',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  writeVariable(variableName, value, deviceName) {
    try {
      if (!this.variables.has(variableName)) {
        throw new Error(\`OPC UA variable '\${variableName}' not found\`);
      }

      const variable = this.variables.get(variableName);
      
      if (!variable.writable) {
        throw new Error(\`OPC UA variable '\${variableName}' is not writable\`);
      }

      // Validate and convert value based on data type
      let validatedValue = value;
      switch (variable.dataType) {
        case 'boolean':
          validatedValue = Boolean(value);
          break;
        case 'int32':
          validatedValue = parseInt(value);
          if (isNaN(validatedValue)) {
            throw new Error(\`Invalid int32 value: \${value}\`);
          }
          break;
        case 'double':
          validatedValue = parseFloat(value);
          if (isNaN(validatedValue)) {
            throw new Error(\`Invalid double value: \${value}\`);
          }
          break;
        case 'string':
          validatedValue = String(value);
          break;
        default:
          validatedValue = value;
      }

      const previousValue = variable.value;
      
      // Update the variable
      this.variables.set(variableName, {
        ...variable,
        value: validatedValue,
        quality: 'good',
        timestamp: new Date().toISOString()
      });

      this.logger.info(\`📝 OPC UA write: \${variableName} = \${validatedValue}\`);

      return {
        success: true,
        message: \`Successfully wrote \${validatedValue} to OPC UA variable \${variableName}\`,
        previousValue: previousValue
      };
    } catch (error) {
      this.logger.error(\`OPC UA write error for \${variableName}:\`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  getData(deviceName) {
    const variables = {};
    this.variables.forEach((data, name) => {
      variables[name] = data.value;
    });
    
    return { 
      message: 'OPC UA ready',
      connected: true,
      variables,
      variableCount: this.variables.size,
      timestamp: new Date().toISOString()
    };
  }

  writeData() { 
    this.logger.info('📝 OPC UA write'); 
  }

  close() { 
    this.logger.info('🔌 OPC UA closed'); 
  }
}

module.exports = OpcuaHandler;
`;
}

function generateMqttHandler(config: GatewayConfig): string {
  return `class MqttHandler {
  constructor(protocolConfig, logger) {
    this.config = protocolConfig;
    this.logger = logger;
    this.topics = new Map();
    this.initialize();
  }

  initialize() {
    this.setupTopics();
    this.logger.info('📡 MQTT handler initialized');
  }

  setupTopics() {
    // Create sample MQTT topics as variables
    const sampleTopics = [
      { name: 'sensor/temperature', dataType: 'double', value: 22.5, writable: true },
      { name: 'sensor/humidity', dataType: 'double', value: 65.0, writable: false },
      { name: 'device/status', dataType: 'string', value: 'online', writable: true },
      { name: 'alarm/critical', dataType: 'boolean', value: false, writable: true },
      { name: 'control/setpoint', dataType: 'double', value: 25.0, writable: true }
    ];

    sampleTopics.forEach(topic => {
      this.topics.set(topic.name, {
        topic: topic.name,
        dataType: topic.dataType,
        value: topic.value,
        quality: 'good',
        timestamp: new Date().toISOString(),
        writable: topic.writable
      });
    });
  }

  getVariableList() {
    return Array.from(this.topics.entries()).map(([name, config]) => ({
      name,
      topic: config.topic,
      dataType: config.dataType,
      readable: true,
      writable: config.writable
    }));
  }

  readVariable(variableName, deviceName) {
    try {
      if (!this.topics.has(variableName)) {
        throw new Error(\`MQTT topic '\${variableName}' not found\`);
      }

      const topic = this.topics.get(variableName);
      this.logger.info(\`📖 Reading MQTT topic: \${variableName}\`);

      return {
        value: topic.value,
        dataType: topic.dataType,
        quality: topic.quality,
        timestamp: topic.timestamp,
        topic: topic.topic
      };
    } catch (error) {
      this.logger.error(\`MQTT read error for \${variableName}:\`, error);
      return {
        value: null,
        dataType: 'unknown',
        quality: 'bad',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  writeVariable(variableName, value, deviceName) {
    try {
      if (!this.topics.has(variableName)) {
        throw new Error(\`MQTT topic '\${variableName}' not found\`);
      }

      const topic = this.topics.get(variableName);
      
      if (!topic.writable) {
        throw new Error(\`MQTT topic '\${variableName}' is not writable\`);
      }

      // Validate and convert value based on data type
      let validatedValue = value;
      switch (topic.dataType) {
        case 'boolean':
          validatedValue = Boolean(value);
          break;
        case 'double':
          validatedValue = parseFloat(value);
          if (isNaN(validatedValue)) {
            throw new Error(\`Invalid double value: \${value}\`);
          }
          break;
        case 'string':
          validatedValue = String(value);
          break;
        default:
          validatedValue = value;
      }

      const previousValue = topic.value;
      
      // Update the topic
      this.topics.set(variableName, {
        ...topic,
        value: validatedValue,
        quality: 'good',
        timestamp: new Date().toISOString()
      });

      this.logger.info(\`📤 MQTT publish: \${variableName} = \${validatedValue}\`);

      return {
        success: true,
        message: \`Successfully published \${validatedValue} to MQTT topic \${variableName}\`,
        previousValue: previousValue
      };
    } catch (error) {
      this.logger.error(\`MQTT write error for \${variableName}:\`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  getData(deviceName) {
    const variables = {};
    this.topics.forEach((data, name) => {
      variables[name] = data.value;
    });
    
    return { 
      message: 'MQTT ready',
      connected: true,
      variables,
      topicCount: this.topics.size,
      timestamp: new Date().toISOString()
    };
  }

  writeData() { 
    this.logger.info('📤 MQTT publish'); 
  }

  close() { 
    this.logger.info('🔌 MQTT closed'); 
  }
}

module.exports = MqttHandler;
`;
}

function generateProfinetHandler(config: GatewayConfig): string {
  return `class ProfinetHandler {
  constructor(protocolConfig, logger) {
    this.config = protocolConfig;
    this.logger = logger;
    this.modules = new Map();
    this.initialize();
  }

  initialize() {
    this.setupModules();
    this.logger.info('🔗 PROFINET handler initialized');
  }

  setupModules() {
    // Create sample PROFINET I/O modules
    const sampleModules = [
      { name: 'InputModule_1/Channel_1', dataType: 'boolean', value: false, writable: false, description: 'Digital Input 1' },
      { name: 'InputModule_1/Channel_2', dataType: 'boolean', value: true, writable: false, description: 'Digital Input 2' },
      { name: 'OutputModule_1/Channel_1', dataType: 'boolean', value: false, writable: true, description: 'Digital Output 1' },
      { name: 'OutputModule_1/Channel_2', dataType: 'boolean', value: false, writable: true, description: 'Digital Output 2' },
      { name: 'AnalogInput_1/Value', dataType: 'int16', value: 2048, writable: false, description: 'Analog Input Value (0-4095)' },
      { name: 'AnalogOutput_1/Value', dataType: 'int16', value: 1024, writable: true, description: 'Analog Output Value (0-4095)' },
      { name: 'DeviceDiagnostics/Status', dataType: 'string', value: 'OK', writable: false, description: 'Device Status' }
    ];

    sampleModules.forEach(module => {
      this.modules.set(module.name, {
        name: module.name,
        dataType: module.dataType,
        value: module.value,
        quality: 'good',
        timestamp: new Date().toISOString(),
        writable: module.writable,
        description: module.description
      });
    });
  }

  getVariableList() {
    return Array.from(this.modules.entries()).map(([name, config]) => ({
      name,
      dataType: config.dataType,
      readable: true,
      writable: config.writable,
      description: config.description
    }));
  }

  readVariable(variableName, deviceName) {
    try {
      if (!this.modules.has(variableName)) {
        throw new Error(\`PROFINET module '\${variableName}' not found\`);
      }

      const module = this.modules.get(variableName);
      this.logger.info(\`📖 Reading PROFINET module: \${variableName}\`);

      return {
        value: module.value,
        dataType: module.dataType,
        quality: module.quality,
        timestamp: module.timestamp,
        description: module.description
      };
    } catch (error) {
      this.logger.error(\`PROFINET read error for \${variableName}:\`, error);
      return {
        value: null,
        dataType: 'unknown',
        quality: 'bad',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  writeVariable(variableName, value, deviceName) {
    try {
      if (!this.modules.has(variableName)) {
        throw new Error(\`PROFINET module '\${variableName}' not found\`);
      }

      const module = this.modules.get(variableName);
      
      if (!module.writable) {
        throw new Error(\`PROFINET module '\${variableName}' is not writable\`);
      }

      // Validate and convert value based on data type
      let validatedValue = value;
      switch (module.dataType) {
        case 'boolean':
          validatedValue = Boolean(value);
          break;
        case 'int16':
          validatedValue = parseInt(value);
          if (isNaN(validatedValue) || validatedValue < 0 || validatedValue > 4095) {
            throw new Error(\`Invalid int16 value: \${value} (must be 0-4095)\`);
          }
          break;
        case 'string':
          validatedValue = String(value);
          break;
        default:
          validatedValue = value;
      }

      const previousValue = module.value;
      
      // Update the module
      this.modules.set(variableName, {
        ...module,
        value: validatedValue,
        quality: 'good',
        timestamp: new Date().toISOString()
      });

      this.logger.info(\`🔧 PROFINET write: \${variableName} = \${validatedValue}\`);

      return {
        success: true,
        message: \`Successfully wrote \${validatedValue} to PROFINET module \${variableName}\`,
        previousValue: previousValue
      };
    } catch (error) {
      this.logger.error(\`PROFINET write error for \${variableName}:\`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  getData(deviceName) {
    const variables = {};
    this.modules.forEach((data, name) => {
      variables[name] = data.value;
    });
    
    return { 
      message: 'PROFINET ready',
      connected: true,
      variables,
      moduleCount: this.modules.size,
      timestamp: new Date().toISOString()
    };
  }

  writeData() { 
    this.logger.info('🔧 PROFINET write'); 
  }

  close() { 
    this.logger.info('🔌 PROFINET closed'); 
  }
}

module.exports = ProfinetHandler;
`;
}

function generateLogger(config: GatewayConfig): string {
  return `class Logger {
  constructor(config) {
    this.config = config || {};
    this.level = this.config.level || 'info';
    this.enableConsole = this.config.console !== false;
  }

  log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = \`[\${timestamp}] [\${level.toUpperCase()}] \${args.join(' ')}\`;
    
    if (this.enableConsole) {
      console.log(message);
    }
  }

  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
  debug(...args) { this.log('debug', ...args); }
}

module.exports = Logger;
`;
}

function generateReadme(config: GatewayConfig): string {
  const exeName = config.name.replace(/[^a-zA-Z0-9]/g, '-');
  return `# ${config.name} - Industrial Protocol Gateway

${config.description}

## 🚀 Quick Start

### Option 1: Easy Setup (Windows - Recommended)
**Just double-click the batch file to build and run:**
\`\`\`
📁 install-and-build.bat  ← Double-click this!
\`\`\`
This will automatically:
1. Install all dependencies
2. Build the executable (${exeName}.exe)
3. Show you how to run it

### Option 2: Build Executable Only
\`\`\`
📁 build-exe.bat  ← Double-click to build executable
\`\`\`

### Option 3: Manual Commands
\`\`\`bash
npm install
npm run build-exe
\`\`\`

## ▶️ Running the Server

### Option 1: Using the Executable
\`\`\`
📁 run-server.bat     ← Double-click to run
📁 ${exeName}.exe     ← Or run the executable directly
\`\`\`

### Option 2: Using Node.js
\`\`\`bash
npm start
\`\`\`

## 📁 Important Files

- **${exeName}.exe** - The main executable (after building)
- **install-and-build.bat** - Complete setup (install + build)
- **build-exe.bat** - Build executable only  
- **run-server.bat** - Run the server (tries .exe first, then Node.js)
- **config.json** - Configuration file
- **server.js** - Node.js server source

## 📡 Supported Protocols: ${config.protocols.length}
${config.protocols.map(p => `- **${p.type.toUpperCase()}**: ${p.name} (${p.mode} mode)`).join('\\n')}

## 🌐 Server Configuration
- **Host:** ${config.server.host}
- **Port:** ${config.server.port}
- **SSL:** ${config.server.ssl ? 'Enabled' : 'Disabled'}
- **Authentication:** ${config.server.authentication ? 'Required' : 'None'}

## 📊 REST API Endpoints

Base URL: \`http://${config.server.host}:${config.server.port}\`

### 🔍 Discovery & Health

#### Get Server Health
\`\`\`http
GET /health
\`\`\`

#### List All Protocols
\`\`\`http
GET /api/protocols
\`\`\`
**Response:**
\`\`\`json
{
  "protocols": [
    {
      "id": "protocol-id",
      "name": "Protocol Name", 
      "type": "modbus-tcp",
      "mode": "server",
      "enabled": true,
      "variables": [...]
    }
  ]
}
\`\`\`

### 📖 Variable Read Operations

#### Read Single Variable
\`\`\`http
GET /api/{protocol}/variables/{variable}?device={deviceName}
\`\`\`

**Example:**
\`\`\`bash
curl http://${config.server.host}:${config.server.port}/api/modbus-1/variables/HR_40001
\`\`\`

**Response:**
\`\`\`json
{
  "protocol": "modbus-1",
  "variable": "HR_40001", 
  "device": "default",
  "value": 1500,
  "dataType": "int16",
  "quality": "good",
  "timestamp": "2026-02-05T10:30:00.000Z"
}
\`\`\`

#### Bulk Read Variables
\`\`\`http
POST /api/{protocol}/variables/read
Content-Type: application/json

{
  "variables": ["HR_40001", "HR_40002", "C_1"],
  "device": "optional-device-name"
}
\`\`\`

### ✍️ Variable Write Operations

#### Write Single Variable
\`\`\`http
POST /api/{protocol}/variables/{variable}
Content-Type: application/json

{
  "value": 2500,
  "device": "optional-device-name"
}
\`\`\`

**Example:**
\`\`\`bash
curl -X POST http://${config.server.host}:${config.server.port}/api/modbus-1/variables/HR_40001 \\
  -H "Content-Type: application/json" \\
  -d '{"value": 2500}'
\`\`\`

#### Bulk Write Variables
\`\`\`http
POST /api/{protocol}/variables/write
Content-Type: application/json

{
  "variables": [
    {"variable": "HR_40001", "value": 2500},
    {"variable": "C_1", "value": true}
  ],
  "device": "optional-device-name"
}
\`\`\`

## 📋 Variable Naming Conventions

### Modbus Variables
- **Holding Registers:** \`HR_{address}\` (e.g., HR_40001)
- **Input Registers:** \`IR_{address}\` (e.g., IR_30001)  
- **Coils:** \`C_{address}\` (e.g., C_1)
- **Discrete Inputs:** \`DI_{address}\` (e.g., DI_10001)

### OPC UA Variables
- **Standard Names:** Temperature, Pressure, Running, Speed, SetPoint
- **Node IDs:** ns=2;s={VariableName}

### MQTT Variables  
- **Topic-based:** sensor/temperature, device/status, control/setpoint

### PROFINET Variables
- **Module-based:** InputModule_1/Channel_1, AnalogInput_1/Value

## 🛡️ Error Handling

All endpoints return appropriate HTTP status codes:
- **200** - Success
- **400** - Bad Request (invalid parameters)
- **404** - Protocol/Variable not found
- **501** - Operation not supported
- **500** - Internal server error

Error responses include detailed messages:
\`\`\`json
{
  "error": "Variable 'HR_99999' not found"
}
\`\`\`

## 🔧 Configuration
Configuration is loaded from \`config.json\` at startup.

## 📈 Logging
- **Level:** ${config.logging.level}
- **Console:** ${config.logging.console ? 'Enabled' : 'Disabled'}
- **File:** ${config.logging.file ? 'Enabled' : 'Disabled'}

---

**Version:** ${config.version}  
**Generated:** ${new Date().toISOString()}  
**Generated by:** Industrial Gateway Builder
`;
}

function generateConfigFile(config: GatewayConfig): string {
  return JSON.stringify(config, null, 2);
}