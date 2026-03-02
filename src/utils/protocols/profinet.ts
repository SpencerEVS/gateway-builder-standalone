import { GatewayConfig } from '../gatewayGenerator';

export function generateProfinetHandler(config: GatewayConfig): string {
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