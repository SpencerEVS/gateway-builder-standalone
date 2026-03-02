// Enhanced server code generation utilities for Industrial Protocol Gateway Builder with EXE support
import { 
  generatePythonModbusServer, 
  generateModbusProxy, 
  generatePythonRequirements, 
  generateModbusStarter,
  generateOpcuaHandler,
  generateMqttHandler,
  generateProfinetHandler,
  generateMidiHandler,
  generateMidiBridge
} from './protocols';

export interface ProtocolConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  mode: 'server' | 'client';
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
  'protocols/modbus_server.py'?: string;
  'protocols/modbus.js'?: string;
  'protocols/opcua.js'?: string;
  'protocols/mqtt.js'?: string;
  'protocols/profinet.js'?: string;
  'protocols/midi.js'?: string;
  'protocols/midi_bridge.py'?: string;
  'utils/logger.js': string;
  'config.json': string;
  'web-app-api-config.json': string;
  'gateway-builder-config.json': string;
  'README.md': string;
  'requirements.txt': string;
  'start-modbus.py'?: string;
  'build-exe.js': string;
  'build-exe.bat': string;
  'install-and-build.bat': string;
  'run-server.bat': string;
  zipBuffer: ArrayBuffer;
}

export async function generateServerFiles(config: GatewayConfig): Promise<GeneratedFiles> {
  // Check which protocols are enabled
  const hasModbus = config.protocols.some(p => p.type.includes('modbus') && p.enabled);
  const hasOpcua = config.protocols.some(p => p.type === 'opcua' && p.enabled);
  const hasMqtt = config.protocols.some(p => p.type === 'mqtt' && p.enabled);
  const hasProfinet = config.protocols.some(p => p.type === 'profinet' && p.enabled);
  const hasMidi = config.protocols.some(p => p.type === 'midi' && p.enabled);

  console.log('🔍 Gateway Generation - Protocol Detection:');
  console.log(`   Modbus: ${hasModbus ? '✅ ENABLED' : '❌ disabled'}`);
  console.log(`   OPC UA: ${hasOpcua ? '✅ ENABLED' : '❌ disabled'}`);
  console.log(`   MQTT: ${hasMqtt ? '✅ ENABLED' : '❌ disabled'}`);
  console.log(`   PROFINET: ${hasProfinet ? '✅ ENABLED' : '❌ disabled'}`);
  console.log(`   MIDI: ${hasMidi ? '✅ ENABLED' : '❌ disabled'}`);
  console.log(`   Total enabled protocols: ${config.protocols.filter(p => p.enabled).length}`);

  const files: Omit<GeneratedFiles, 'zipBuffer'> = {
    'package.json': generatePackageJson(config),
    'server.js': generateMainServer(config),
    'utils/logger.js': generateLogger(config),
    'config.json': generateConfigFile(config),
    'web-app-api-config.json': generateWebAppApiConfig(config),
    'gateway-builder-config.json': generateGatewayBuilderConfig(config),
    'README.md': generateReadme(config),
    'requirements.txt': generatePythonRequirements(config), // Python dependencies
    'build-exe.js': generateBuildScript(config),
    'build-exe.bat': generateBuildBatch(config),
    'install-and-build.bat': generateInstallAndBuildBatch(config),
    'run-server.bat': generateRunServerBatch(config)
  };

  // Only generate protocol files for enabled protocols
  if (hasModbus) {
    files['protocols/modbus_server.py'] = generatePythonModbusServer(config);
    files['protocols/modbus.js'] = generateModbusProxy(config);
    files['start-modbus.py'] = generateModbusStarter(config);
  }
  if (hasOpcua) {
    files['protocols/opcua.js'] = generateOpcuaHandler(config);
  }
  if (hasMqtt) {
    files['protocols/mqtt.js'] = generateMqttHandler(config);
  }
  if (hasProfinet) {
    files['protocols/profinet.js'] = generateProfinetHandler(config);
  }
  if (hasMidi) {
    files['protocols/midi.js'] = generateMidiHandler(config);
    files['protocols/midi_bridge.py'] = generateMidiBridge(config);
  }

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
  const hasModbus = config.protocols.some(p => p.type.includes('modbus') && p.enabled);
  const hasMidi = config.protocols.some(p => p.type === 'midi' && p.enabled);
  const hasMqtt = config.protocols.some(p => p.type === 'mqtt' && p.enabled);
  
  let pythonVerification = '';
  if (hasModbus) {
    pythonVerification += '        python -c "import pymodbus; print(\'  - pymodbus: OK\')" 2>nul || echo   - pymodbus: NOT INSTALLED\n';
  }
  if (hasMqtt) {
    pythonVerification += '        python -c "import asyncio_mqtt; print(\'  - asyncio-mqtt: OK\')" 2>nul || echo   - asyncio-mqtt: NOT INSTALLED\n';
  }
  if (hasMidi) {
    pythonVerification += '        python -c "import rtmidi; print(\'  - python-rtmidi: OK\')" 2>nul || echo   - python-rtmidi: NOT INSTALLED\n';
  }
  if (!pythonVerification) {
    pythonVerification = '        echo   No Python packages required for this configuration.\n';
  }
  
  return `@echo off
echo ========================================
echo ${config.name} - Complete Setup
echo ========================================
echo.

echo Step 1: Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Python is not installed or not in PATH!
    echo Please install Python 3.7+ for protocol support.
    echo Download from: https://www.python.org/downloads/
    echo.
    echo Continuing with Node.js setup only...
) else (
    echo Python found.
    findstr /R "^[^#]" requirements.txt >nul 2>&1
    if errorlevel 1 (
        echo No Python dependencies required for this configuration.
    ) else (
        echo Installing Python dependencies...
        echo.
        pip install -r requirements.txt
        if errorlevel 1 (
            echo.
            echo WARNING: Failed to install Python dependencies!
            echo Some protocols may not work properly.
            echo.
            echo Try installing manually:
            echo   pip install -r requirements.txt
            echo.
        ) else (
            echo.
            echo ========================================
            echo Python dependencies installed successfully!
            echo ========================================
            echo.
            echo Verifying installation...
${pythonVerification}        echo.
        )
    )
)

echo.
echo Step 2: Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies!
    echo Make sure Node.js and npm are installed.
    pause
    exit /b 1
)

echo.
echo Step 3: Building executable...
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
echo NOTE: Modbus functionality requires Python and pymodbus
pause
`;
}

function generateRunServerBatch(config: GatewayConfig): string {
  const exeName = config.name.replace(/[^a-zA-Z0-9]/g, '-');
  const hasModbus = config.protocols.some(p => p.type.includes('modbus') && p.enabled);
  const serverPort = config.protocols.find(p => p.type === 'modbus-tcp')?.settings?.serverPort || 502;
  
  let modbusStartup = '';
  if (hasModbus) {
    modbusStartup = `
REM Start Python Modbus Server
python --version >nul 2>&1
if not errorlevel 1 (
    echo 🐍 Starting Python Modbus Server on port ${serverPort}...
    start "Python Modbus Server" cmd /k "python protocols/modbus_server.py ${serverPort} && echo Modbus server started && pause"
    timeout /t 3 >nul
) else (
    echo ⚠️  Python not found - Modbus functionality disabled
    echo Install Python to enable Modbus TCP server
)
echo.
`;
  }
  
  return `@echo off
title ${config.name} Server
color 0A
echo ========================================
echo Starting ${config.name}
echo ========================================
echo.
${modbusStartup}
echo 🚀 Starting Node.js Gateway Server...

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
  
  if (uniqueProtocolTypes.includes('modbus-tcp')) {
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
  if (uniqueProtocolTypes.includes('midi')) {
    protocolAssets.push('protocols/midi.js');
    protocolScripts.push('protocols/midi.js');
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
      'node-opcua': '^2.74.0',
      'mqtt': '^4.3.7',
      'aedes': '^0.48.0'
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
if (enabledProtocols.includes('modbus-tcp')) {
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
if (enabledProtocols.includes('midi')) {
  ProtocolHandlers.MidiHandler = loadProtocolModule('midi');
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
    this.app.get('/api/:protocol/variables/:variable', async (req, res) => {
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

        const result = await handler.readVariable(variable, device);
        
        // Ensure result has the proper structure
        if (!result || typeof result !== 'object') {
          return res.status(404).json({ 
            error: 'Variable not found or no value available',
            protocol,
            variable,
            device: device || 'default',
            timestamp: new Date().toISOString()
          });
        }

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

    // Bulk read multiple variables - MUST be registered before single-variable route
    this.app.post('/api/:protocol/variables/read', async (req, res) => {
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

        // Build values object for WebHMI compatibility
        const values = {};
        const errors = {};
        
        await Promise.all(variables.map(async variable => {
          try {
            if (handler.readVariable) {
              const result = await handler.readVariable(variable, device);
              values[variable] = result?.value;
            } else {
              errors[variable] = 'Read operation not supported';
            }
          } catch (error) {
            errors[variable] = error.message;
          }
        }));

        // Response format matches WebHMI expectations
        const response = {
          protocol,
          values,
          timestamp: new Date().toISOString()
        };
        
        // Include errors if any occurred
        if (Object.keys(errors).length > 0) {
          response.errors = errors;
        }

        res.json(response);
      } catch (error) {
        this.logger.error('Bulk Read Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Bulk write multiple variables - MUST be registered before single-variable route
    this.app.post('/api/:protocol/variables/write', async (req, res) => {
      try {
        const { protocol } = req.params;
        let { variables, device } = req.body;
        const handler = this.protocolHandlers.get(protocol);
        
        if (!handler) {
          return res.status(404).json({ error: 'Protocol not found' });
        }

        // If no 'variables' key, fall back to root-level keys (from WebHMI argument body params)
        if (variables === undefined || variables === null) {
          const reservedKeys = new Set(['device', 'protocol']);
          const rootVars = {};
          Object.keys(req.body).forEach(key => {
            if (!reservedKeys.has(key)) {
              rootVars[key] = req.body[key];
            }
          });
          if (Object.keys(rootVars).length > 0) {
            variables = rootVars;
          }
        }

        // Support both object format {var1: val1, var2: val2} and array format [{variable: "var1", value: val1}]
        let variablesToWrite = [];
        
        if (Array.isArray(variables)) {
          // Array format: [{variable: "var1", value: val1}]
          variablesToWrite = variables;
        } else if (typeof variables === 'object' && variables !== null) {
          // Object format: {var1: val1, var2: val2}
          variablesToWrite = Object.entries(variables).map(([variable, value]) => ({ variable, value }));
        } else {
          return res.status(400).json({ error: 'Variables must be an object or array' });
        }

        const written = {};
        const errors = {};
        
        await Promise.all(variablesToWrite.map(async ({ variable, value }) => {
          try {
            if (handler.writeVariable) {
              await handler.writeVariable(variable, value, device);
              written[variable] = value;
            } else {
              errors[variable] = 'Write operation not supported';
            }
          } catch (error) {
            errors[variable] = error.message;
          }
        }));

        const response = {
          protocol,
          success: Object.keys(errors).length === 0,
          written: Object.keys(written).length,
          timestamp: new Date().toISOString()
        };
        
        if (Object.keys(errors).length > 0) {
          response.errors = errors;
        }

        res.json(response);
      } catch (error) {
        this.logger.error('Bulk Write Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Write single variable to specific protocol
    this.app.post('/api/:protocol/variables/:variable', async (req, res) => {
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

        const result = await handler.writeVariable(variable, value, device);
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
          case 'midi':
            if (ProtocolHandlers.MidiHandler) {
              handler = new ProtocolHandlers.MidiHandler(protocolConfig, this.logger);
            } else {
              this.logger.warn(\`MIDI protocol not loaded - skipping \${protocolConfig.name}\`);
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

## � Python Dependencies

Some protocols require Python 3.7+ and additional packages:
- **Modbus**: Requires \`pymodbus>=3.0.0\`
- **MIDI**: Requires \`python-rtmidi>=1.5.0\`

### Installing Python Dependencies

The **install-and-build.bat** automatically installs these. For manual installation:

\`\`\`bash
# Install Python dependencies
pip install -r requirements.txt
\`\`\`

**Troubleshooting:** If you see "ModuleNotFoundError: No module named 'rtmidi'", run: \`pip install python-rtmidi\` and ensure that Python installation is in your PATH. The gateway uses whatever Python is found first in PATH.

## �📁 Important Files

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

function generateWebAppApiConfig(config: GatewayConfig): string {
  // Helper function to extract variables from protocol settings
  const getProtocolVariables = (protocol: ProtocolConfig) => {
    const settings = protocol.settings || {};
    const variables: any[] = [];

    switch (protocol.type) {
      case 'modbus-tcp':
        // Holding registers (read/write)
        if (settings.registerMap?.holdingRegisters?.variables) {
          variables.push(...settings.registerMap.holdingRegisters.variables.map((v: any) => ({
            name: v.name,
            dataType: 'int16',
            writable: true,
            description: v.description,
            address: v.address
          })));
        }
        // Input registers (read-only)
        if (settings.registerMap?.inputRegisters?.variables) {
          variables.push(...settings.registerMap.inputRegisters.variables.map((v: any) => ({
            name: v.name,
            dataType: 'int16',
            writable: false,
            description: v.description,
            address: v.address
          })));
        }
        // Coils (read/write)
        if (settings.registerMap?.coils?.variables) {
          variables.push(...settings.registerMap.coils.variables.map((v: any) => ({
            name: v.name,
            dataType: 'boolean',
            writable: true,
            description: v.description,
            address: v.address
          })));
        }
        // Discrete inputs (read-only)
        if (settings.registerMap?.discreteInputs?.variables) {
          variables.push(...settings.registerMap.discreteInputs.variables.map((v: any) => ({
            name: v.name,
            dataType: 'boolean',
            writable: false,
            description: v.description,
            address: v.address
          })));
        }
        break;

      case 'opcua':
        if (settings.variables) {
          variables.push(...settings.variables.map((v: any) => ({
            name: v.name,
            dataType: v.dataType?.toLowerCase() || 'double',
            writable: true,
            description: v.description,
            nodeId: v.nodeId
          })));
        }
        break;

      case 'mqtt':
        if (settings.topics && Array.isArray(settings.topics)) {
          variables.push(...settings.topics.map((t: any) => ({
            name: typeof t === 'string' ? t : (t.name || t.topic),
            dataType: t.dataType || 'string',
            writable: true,
            description: t.description || `MQTT topic: ${t.topic || t.name}`,
            topic: t.topic || t.name
          })));
        }
        break;

      case 'profinet':
        if (settings.modules) {
          settings.modules.forEach((module: any) => {
            for (let i = 1; i <= (module.channels || 1); i++) {
              variables.push({
                name: `${module.name}/Channel_${i}`,
                dataType: module.type?.includes('analog') ? 'int16' : 'boolean',
                writable: module.type?.includes('output') || false,
                description: `${module.description} - Channel ${i}`,
                module: module.name
              });
            }
          });
        }
        break;

      case 'midi':
        if (settings.variables) {
          variables.push(...settings.variables.map((v: any) => ({
            name: v.name,
            dataType: v.dataType || 'int',
            writable: false,
            description: v.description || `MIDI ${v.messageType}`,
            messageType: v.messageType,
            channel: v.channel,
            note: v.note,
            controller: v.controller
          })));
        }
        break;
    }

    return variables;
  };

  // Build the API configuration in WebHMI DataConnection format
  const baseUrl = `http://${config.server.host}:${config.server.port}`;
  const apiConnections: any[] = [];
  const timestamp = Date.now();

  config.protocols.forEach(protocol => {
    if (!protocol.enabled) return; // Skip disabled protocols

    const variables = getProtocolVariables(protocol);
    const variableNames = variables.map(v => v.name);
    const writableVariables = variables.filter(v => v.writable);

    // Create batch read connection
    if (variables.length > 0) {
      // Build sample values object with example data for each variable
      const sampleValues = variables.reduce((acc: any, v) => {
        if (v.dataType === 'boolean') {
          acc[v.name] = false;
        } else if (v.dataType === 'string') {
          acc[v.name] = 'example';
        } else {
          acc[v.name] = 0;
        }
        return acc;
      }, {});
      
      const sampleResponse = JSON.stringify({
        protocol: protocol.id,
        values: sampleValues,
        timestamp: '2026-02-24T10:00:00.000Z'
      }, null, 2);
      
      const readConnection: any = {
        id: `api-${protocol.id}-batch-read-${timestamp}`,
        name: `${protocol.name} - Batch Read All`,
        url: `${baseUrl}/api/${protocol.id}/variables/read`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: {},
        body: JSON.stringify({ variables: variableNames }, null, 2),
        arguments: [],
        trigger: {
          type: 'cyclic',
          interval: 5000
        },
        sampleResponse,
        variables: variables.map((v, idx) => ({
          id: `var-${timestamp}-${idx}`,
          name: v.name,
          jsonPath: `values.${v.name}`,
          type: v.dataType === 'boolean' ? 'boolean' : v.dataType === 'string' ? 'string' : 'number',
          description: v.description || ''
        })),
        additionalConfig: JSON.stringify({ variables: variableNames }, null, 2),
        enabled: true
      };
      
      apiConnections.push(readConnection);
    }

    // Create batch write connection
    if (writableVariables.length > 0) {
      const writeConnection: any = {
        id: `api-${protocol.id}-batch-write-${timestamp}`,
        name: `${protocol.name} - Batch Write`,
        url: `${baseUrl}/api/${protocol.id}/variables/write`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: {},
        body: '',
        arguments: writableVariables.map((v, idx) => ({
          id: `arg-${timestamp}-${idx}`,
          name: v.name,
          type: 'variable',
          value: v.name,
          description: `Write value for ${v.name}`
        })),
        trigger: {
          type: 'conditional',
          condition: {
            variable: 'writeEnable',
            operator: '==',
            value: true
          }
        },
        sampleResponse: '{\n  "success": true,\n  "protocol": "' + protocol.id + '",\n  "written": ' + writableVariables.length + ',\n  "timestamp": "2026-02-24T10:00:00.000Z"\n}',
        variables: [
          {
            id: `var-write-success-${timestamp}`,
            name: 'writeSuccess',
            jsonPath: 'success',
            type: 'boolean',
            description: 'Write operation success status'
          }
        ],
        enabled: false
      };
      
      apiConnections.push(writeConnection);
    }
  });

  // Create the full web app export format for compatibility
  const webAppExport = {
    dataConnections: {
      apiConnections: apiConnections,
      globalVariables: {}
    },
    gatewayInfo: {
      name: config.name,
      description: config.description,
      version: config.version,
      server: {
        host: config.server.host,
        port: config.server.port,
        baseUrl: baseUrl
      },
      generatedAt: new Date().toISOString(),
      protocolCount: config.protocols.filter(p => p.enabled).length
    }
  };

  return JSON.stringify(webAppExport, null, 2);
}

function generateGatewayBuilderConfig(config: GatewayConfig): string {
  // Export complete gateway configuration for importing back into the gateway builder
  const builderConfig = {
    exportType: 'gateway-builder',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    config: config
  };

  return JSON.stringify(builderConfig, null, 2);
}
