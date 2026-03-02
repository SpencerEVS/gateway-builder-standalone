import { GatewayConfig } from '../gatewayGenerator';

export function generateOpcuaHandler(config: GatewayConfig): string {
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