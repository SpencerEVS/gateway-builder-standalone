import React, { useState } from 'react';
import { generateServerFiles, type GatewayConfig, type ProtocolConfig } from '../../utils/gatewayGenerator';

// Web MIDI API type declarations
declare global {
  interface Navigator {
    requestMIDIAccess(options?: { sysex?: boolean }): Promise<any>;
  }
}

const defaultConfig: GatewayConfig = {
  name: 'Industrial Gateway',
  version: '1.0.0',
  description: 'Industrial Protocol Gateway - Configure protocols for your automation system',
  server: {
    host: '127.0.0.1',
    port: 9080,
    ssl: false,
    authentication: false
  },
  protocols: [],
  logging: {
    level: 'info',
    file: false,
    console: true
  }
};

const protocolTypes = [
  { value: 'modbus-tcp', label: 'Modbus TCP' },
  { value: 'opcua', label: 'OPC UA' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'profinet', label: 'PROFINET' },
  { value: 'midi', label: 'MIDI' }
];

const GatewayBuilder: React.FC = () => {
  const [config, setConfig] = useState<GatewayConfig>(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeProtocolTab, setActiveProtocolTab] = useState<string>('http-api');
  const [activeRegisterTab, setActiveRegisterTab] = useState<{[protocolId: string]: string}>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [midiConnecting, setMidiConnecting] = useState(false);
  const [midiDevices, setMidiDevices] = useState<{inputs: string[], outputs: string[]}>({inputs: [], outputs: []});
  const [midiAccessRef, setMidiAccessRef] = useState<any>(null);

  const updateConfig = (field: keyof GatewayConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const addProtocol = () => {
    const newProtocolId = `protocol-${Date.now()}`;
    const newProtocol: ProtocolConfig = {
      id: newProtocolId,
      name: 'New Protocol',
      type: 'modbus-tcp' as const,
      enabled: true,
      mode: 'server' as const,
      settings: getDefaultProtocolSettings('modbus-tcp', 'server')
    };
    
    setConfig(prev => ({
      ...prev,
      protocols: [...prev.protocols, newProtocol]
    }));
    
    // Switch to the new protocol tab
    setActiveProtocolTab(newProtocolId);
  };

  const updateProtocol = (index: number, updates: any) => {
    setConfig(prev => ({
      ...prev,
      protocols: prev.protocols.map((p, i) => 
        i === index ? { ...p, ...updates } : p
      )
    }));
  };

  const removeProtocol = (index: number) => {
    setConfig(prev => ({
      ...prev,
      protocols: prev.protocols.filter((_, i) => i !== index)
    }));
  };

  const getDefaultProtocolSettings = (type: string, mode: 'client' | 'server') => {
    switch (type) {
      case 'modbus-tcp':
        return mode === 'server' ? {
          serverPort: 502,
          unitId: 1,
          registerMap: {
            holdingRegisters: { 
              start: 0, 
              count: 0,
              variables: []
            },
            coils: { 
              start: 0, 
              count: 0,
              variables: []
            }
          }
        } : {
          devices: [{
            name: 'Device1',
            ip: '192.168.1.100',
            port: 5020,
            unitId: 1
          }]
        };
      case 'opcua':
        return mode === 'server' ? {
          serverPort: 4840,
          namespace: 'urn:gateway:opcua',
          variables: [
            { name: 'Temperature', nodeId: 'ns=2;s=Temperature', dataType: 'Double', description: 'Process Temperature' },
            { name: 'Pressure', nodeId: 'ns=2;s=Pressure', dataType: 'Double', description: 'System Pressure' },
            { name: 'Running', nodeId: 'ns=2;s=Running', dataType: 'Boolean', description: 'System Running State' },
            { name: 'Speed', nodeId: 'ns=2;s=Speed', dataType: 'Int32', description: 'Motor Speed RPM' },
            { name: 'SetPoint', nodeId: 'ns=2;s=SetPoint', dataType: 'Double', description: 'Control Setpoint' }
          ]
        } : {
          endpoint: 'opc.tcp://192.168.1.100:4840'
        };
      case 'mqtt':
        return mode === 'server' ? {
          brokerPort: 1883,
          wsPort: 8883,
          topics: []
        } : {
          broker: 'mqtt://localhost:1883',
          topics: [],
          qos: 1
        };
      case 'profinet':
        return {
          modules: [
            { name: 'DigitalInput_1', type: 'input', channels: 8, description: 'Digital Input Module 1' },
            { name: 'DigitalOutput_1', type: 'output', channels: 8, description: 'Digital Output Module 1' },
            { name: 'AnalogInput_1', type: 'analog_input', channels: 4, description: 'Analog Input Module 1' },
            { name: 'AnalogOutput_1', type: 'analog_output', channels: 2, description: 'Analog Output Module 1' }
          ]
        };
      case 'midi':
        return {
          port: 9981,
          autoLearn: true,
          variables: []
        };
      default:
        return {};
    }
  };

  const generateGateway = async () => {
    setIsGenerating(true);
    try {
      const files = await generateServerFiles(config);
      
      // Create and download the ZIP file
      const blob = new Blob([files.zipBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-gateway.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup URL
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate gateway. Please check the configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') return;
        const content = result;
        const importedData = JSON.parse(content);

        // Validate the structure
        if (importedData.exportType === 'gateway-builder' && importedData.config) {
          // Import the full gateway configuration
          setConfig(importedData.config);
          setImportError(null);
          alert(`Successfully imported gateway configuration: ${importedData.config.name}`);
        } else {
          setImportError('Invalid file format: Expected gateway-builder-config.json file');
        }
      } catch (error) {
        console.error('Import error:', error);
        setImportError(error instanceof Error ? error.message : 'Failed to parse JSON file');
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file');
    };

    reader.readAsText(file);
    // Reset the input so the same file can be imported again
    event.target.value = '';
  };

  const connectToMidi = async (protocolIndex: number) => {
    setMidiConnecting(true);
    try {
      if (!navigator.requestMIDIAccess) {
        alert('Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera.');
        return;
      }

      const access = await navigator.requestMIDIAccess({ sysex: false });
      setMidiAccessRef(access);

      // Get list of devices
      const inputs = Array.from(access.inputs.values()).map((input: any) => input.name);
      const outputs = Array.from(access.outputs.values()).map((output: any) => output.name);
      
      setMidiDevices({ inputs, outputs });

      if (inputs.length === 0) {
        alert('No MIDI input devices found. Please connect a MIDI device and try again.');
        setMidiConnecting(false);
        return;
      }

      alert(`Connected! Found ${inputs.length} MIDI input device(s). Play some notes/controls to auto-populate variables.`);

      // Set up listeners for all inputs to auto-learn variables
      const learnedMessages = new Map();
      
      for (let input of access.inputs.values()) {
        (input as any).onmidimessage = (event: any) => {
          const [status, data1, data2] = event.data;
          const messageType = status & 0xF0;
          const channel = status & 0x0F;
          
          let msgKey = '';
          let varName = '';
          let varConfig: any = {
            channel,
            dataType: 'int',
            description: ''
          };

          switch (messageType) {
            case 0x90: // Note On
              if (data2 > 0) {
                msgKey = `note_on_${channel}_${data1}`;
                varName = `Note_${data1}_CH${channel}`;
                varConfig.messageType = 'note_on';
                varConfig.note = data1;
                varConfig.description = `Note ${data1} (${getNoteNameFromMidi(data1)}) on Channel ${channel}`;
              }
              break;
            case 0x80: // Note Off
              msgKey = `note_off_${channel}_${data1}`;
              varName = `Note_${data1}_Off_CH${channel}`;
              varConfig.messageType = 'note_off';
              varConfig.note = data1;
              varConfig.description = `Note ${data1} Off on Channel ${channel}`;
              break;
            case 0xB0: // Control Change
              msgKey = `control_change_${channel}_${data1}`;
              varName = `CC_${data1}_CH${channel}`;
              varConfig.messageType = 'control_change';
              varConfig.controller = data1;
              varConfig.description = `Control Change ${data1} on Channel ${channel}`;
              break;
            case 0xE0: // Pitch Bend
              msgKey = `pitchwheel_${channel}`;
              varName = `PitchBend_CH${channel}`;
              varConfig.messageType = 'pitchwheel';
              varConfig.description = `Pitch Bend on Channel ${channel}`;
              break;
            case 0xA0: // Aftertouch
              msgKey = `aftertouch_${channel}_${data1}`;
              varName = `Aftertouch_${data1}_CH${channel}`;
              varConfig.messageType = 'aftertouch';
              varConfig.note = data1;
              varConfig.description = `Aftertouch ${data1} on Channel ${channel}`;
              break;
            case 0xC0: // Program Change
              msgKey = `program_change_${channel}`;
              varName = `Program_CH${channel}`;
              varConfig.messageType = 'program_change';
              varConfig.description = `Program Change on Channel ${channel}`;
              break;
          }

          if (msgKey && !learnedMessages.has(msgKey)) {
            learnedMessages.set(msgKey, true);
            varConfig.name = varName;
            
            // Add variable to protocol using functional update to ensure latest state
            setConfig(prevConfig => {
              const updatedProtocols = [...prevConfig.protocols];
              const protocol = updatedProtocols[protocolIndex];
              updatedProtocols[protocolIndex] = {
                ...protocol,
                settings: {
                  ...protocol.settings,
                  variables: [...(protocol.settings?.variables || []), varConfig]
                }
              };
              return {
                ...prevConfig,
                protocols: updatedProtocols
              };
            });
          }
        };
      }

    } catch (error) {
      console.error('MIDI connection error:', error);
      alert(`Failed to connect to MIDI: ${error}`);
      setMidiConnecting(false);
    }
  };

  const disconnectFromMidi = () => {
    if (midiAccessRef) {
      // Remove all message listeners
      for (let input of midiAccessRef.inputs.values()) {
        (input as any).onmidimessage = null;
      }
    }
    
    setMidiAccessRef(null);
    setMidiConnecting(false);
    setMidiDevices({ inputs: [], outputs: [] });
  };

  const getNoteNameFromMidi = (midiNote: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  };

  const getProtocolVariables = (protocol: ProtocolConfig) => {
    const settings = protocol.settings || {};
    
    switch (protocol.type) {
      case 'modbus-tcp':
        const variables = [];
        
        // Add holding registers
        if (settings.registerMap?.holdingRegisters?.variables) {
          variables.push(...settings.registerMap.holdingRegisters.variables.map((v: any) => ({
            name: v.name,
            dataType: 'int16',
            writable: true,
            description: v.description,
            address: v.address
          })));
        }
        
        // Add input registers
        if (settings.registerMap?.inputRegisters?.variables) {
          variables.push(...settings.registerMap.inputRegisters.variables.map((v: any) => ({
            name: v.name,
            dataType: 'int16',
            writable: false,
            description: v.description,
            address: v.address
          })));
        }
        
        // Add coils
        if (settings.registerMap?.coils?.variables) {
          variables.push(...settings.registerMap.coils.variables.map((v: any) => ({
            name: v.name,
            dataType: 'boolean',
            writable: true,
            description: v.description,
            address: v.address
          })));
        }
        
        // Add discrete inputs
        if (settings.registerMap?.discreteInputs?.variables) {
          variables.push(...settings.registerMap.discreteInputs.variables.map((v: any) => ({
            name: v.name,
            dataType: 'boolean',
            writable: false,
            description: v.description,
            address: v.address
          })));
        }
        
        return variables;
        
      case 'opcua':
        if (settings.variables) {
          return settings.variables.map((v: any) => ({
            name: v.name,
            dataType: v.dataType.toLowerCase(),
            writable: true,
            description: v.description,
            nodeId: v.nodeId
          }));
        }
        return [
          { name: 'Temperature', dataType: 'double', writable: true, description: 'Temperature sensor' },
          { name: 'Pressure', dataType: 'double', writable: true, description: 'Pressure sensor' },
          { name: 'Running', dataType: 'boolean', writable: true, description: 'Running status' },
          { name: 'Speed', dataType: 'int32', writable: true, description: 'Motor speed' },
          { name: 'SetPoint', dataType: 'double', writable: true, description: 'Control setpoint' }
        ];
        
      case 'mqtt':
        if (settings.topics && Array.isArray(settings.topics)) {
          return settings.topics.map((t: any) => ({
            name: typeof t === 'string' ? t : t.name || t.topic,
            dataType: t.dataType || 'string',
            writable: true,
            description: t.description || `MQTT topic: ${t.topic || t.name}`,
            topic: t.topic || t.name
          }));
        }
        return [
          { name: 'sensor/temperature', dataType: 'double', writable: true, description: 'Temperature topic' },
          { name: 'sensor/humidity', dataType: 'double', writable: false, description: 'Humidity topic' },
          { name: 'device/status', dataType: 'string', writable: true, description: 'Device status' },
          { name: 'alarm/critical', dataType: 'boolean', writable: true, description: 'Critical alarm' },
          { name: 'control/setpoint', dataType: 'double', writable: true, description: 'Control setpoint' }
        ];
        
      case 'profinet':
        if (settings.modules) {
          const variables = [];
          settings.modules.forEach((module: any) => {
            for (let i = 1; i <= (module.channels || 1); i++) {
              variables.push({
                name: `${module.name}/Channel_${i}`,
                dataType: module.type.includes('analog') ? 'int16' : 'boolean',
                writable: module.type.includes('output'),
                description: `${module.description} - Channel ${i}`,
                module: module.name
              });
            }
          });
          return variables;
        }
        return [
          { name: 'InputModule_1/Channel_1', dataType: 'boolean', writable: false, description: 'Digital Input 1' },
          { name: 'OutputModule_1/Channel_1', dataType: 'boolean', writable: true, description: 'Digital Output 1' },
          { name: 'AnalogInput_1/Value', dataType: 'int16', writable: false, description: 'Analog Input (0-4095)' },
          { name: 'AnalogOutput_1/Value', dataType: 'int16', writable: true, description: 'Analog Output (0-4095)' }
        ];
        
      case 'midi':
        if (settings.variables && settings.variables.length > 0) {
          return settings.variables.map((v: any) => ({
            name: v.name,
            dataType: v.dataType || 'int',
            writable: false,
            description: v.description,
            messageType: v.messageType,
            channel: v.channel,
            note: v.note,
            controller: v.controller
          }));
        }
        return [];
        
      default:
        return [
          { name: 'Variable_1', dataType: 'unknown', writable: true, description: 'Generic variable' }
        ];
    }
  };

  return (
    <div className="gateway-builder">
      <div className="config-panel">
        {/* Basic Settings */}
        <div className="config-section">
          <h3>Basic Settings</h3>
          <div className="form-group">
            <label>Gateway Name:</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => updateConfig('name', e.target.value)}
              placeholder="Industrial Gateway"
            />
          </div>
          <div className="form-group">
            <label>Version:</label>
            <input
              type="text"
              value={config.version}
              onChange={(e) => updateConfig('version', e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={config.description}
              onChange={(e) => updateConfig('description', e.target.value)}
              placeholder="Industrial Protocol Gateway Server"
            />
          </div>
        </div>

        {/* Protocols */}
        <div className="config-section">
          <h3>Protocols</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <button type="button" onClick={addProtocol} className="btn-add">
              Add Protocol
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label className="btn-add" style={{ cursor: 'pointer', margin: 0, fontWeight: '600' }}>
                Import Configuration
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportConfig}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="button"
                onClick={generateGateway}
                disabled={isGenerating}
                className="btn-add"
                style={{ backgroundColor: '#007bff' }}
              >
                {isGenerating ? 'Generating...' : 'Generate EXE Gateway'}
              </button>
            </div>
          </div>
          {importError && (
            <div style={{
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#721c24'
            }}>
              ❌ Import Error: {importError}
              <button
                onClick={() => setImportError(null)}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#721c24'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {/* Protocol Tabs */}
          <div className="protocol-tabs">
            <div className="tab-header">
              <button 
                className={`tab ${activeProtocolTab === 'http-api' ? 'active' : ''}`}
                onClick={() => setActiveProtocolTab('http-api')}
              >
                HTTP API Server
              </button>
              {config.protocols.map((protocol) => (
                <button 
                  key={protocol.id}
                  className={`tab ${activeProtocolTab === protocol.id ? 'active' : ''}`}
                  onClick={() => setActiveProtocolTab(protocol.id)}
                >
                  {protocol.name}
                </button>
              ))}
            </div>
            
            <div className="tab-content">
              {activeProtocolTab === 'http-api' ? (
                <div className="http-api-tab">
                  <h4>HTTP API Server Configuration</h4>
                  <p>The HTTP API Server provides REST endpoints for all configured protocols. It runs on the main server port and provides unified access to all protocol variables.</p>
                  
                  <div className="api-info">
                    <h5>📍 Base URL:</h5>
                    <code>http://{config.server.host}:{config.server.port}</code>
                    
                    <h5>⚙️ Server Configuration:</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Host:</label>
                        <input
                          type="text"
                          value={config.server.host}
                          onChange={(e) => updateConfig('server', { ...config.server, host: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Port:</label>
                        <input
                          type="number"
                          value={config.server.port}
                          onChange={(e) => updateConfig('server', { ...config.server, port: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    {/* API Documentation Dropdowns */}
                    <div className="api-dropdowns">
                      <details className="api-dropdown">
                        <summary>🔍 Discovery & Health Endpoints</summary>
                        <div className="dropdown-content">
                          <div className="api-endpoint">
                            <span className="method get">GET</span>
                            <code>/health</code>
                            <span className="description">Server health, uptime, and protocol status</span>
                          </div>
                          <div className="example">
                            <pre><code>curl http://{config.server.host}:{config.server.port}/health</code></pre>
                            <pre><code>{`{
  "status": "ok",
  "uptime": 142.3,
  "protocols": { "modbus-1": "connected", "midi-1": "connected" },
  "timestamp": "2026-02-26T10:00:00.000Z"
}`}</code></pre>
                          </div>
                          <div className="api-endpoint">
                            <span className="method get">GET</span>
                            <code>/api/protocols</code>
                            <span className="description">List all protocols and their available variables</span>
                          </div>
                          <div className="example">
                            <pre><code>curl http://{config.server.host}:{config.server.port}/api/protocols</code></pre>
                            <pre><code>{`{
  "protocols": [
    {
      "id": "modbus-1",
      "name": "Modbus TCP",
      "type": "modbus-tcp",
      "variables": ["HR_Variable_1", "HR_Variable_2"]
    }
  ]
}`}</code></pre>
                          </div>
                        </div>
                      </details>

                      <details className="api-dropdown">
                        <summary>📖 Variable Read Operations</summary>
                        <div className="dropdown-content">
                          <div className="api-endpoint">
                            <span className="method get">GET</span>
                            <code>/api/&#123;protocolId&#125;/variables/&#123;variableName&#125;</code>
                            <span className="description">Read single variable with metadata</span>
                          </div>
                          <div className="example">
                            <pre><code>curl http://{config.server.host}:{config.server.port}/api/{config.protocols[0]?.id ?? 'modbus-1'}/variables/{(config.protocols[0] ? getProtocolVariables(config.protocols[0]) : [])[0]?.name ?? 'HR_Variable_1'}</code></pre>
                            <pre><code>{`{
  "protocol": "${config.protocols[0]?.id ?? 'modbus-1'}",
  "variable": "${(config.protocols[0] ? getProtocolVariables(config.protocols[0]) : [])[0]?.name ?? 'HR_Variable_1'}",
  "device": "default",
  "value": 1500,
  "dataType": "int16",
  "quality": "good",
  "timestamp": "2026-02-26T10:00:00.000Z"
}`}</code></pre>
                          </div>
                          <div className="api-endpoint">
                            <span className="method post">POST</span>
                            <code>/api/&#123;protocolId&#125;/variables/read</code>
                            <span className="description">Bulk read multiple variables — body: <code>&#123;"variables": ["var1", "var2"]&#125;</code></span>
                          </div>
                          <div className="example">
                            <pre><code>{`curl -X POST http://${config.server.host}:${config.server.port}/api/${config.protocols[0]?.id ?? 'modbus-1'}/variables/read \\
  -H "Content-Type: application/json" \\
  -d '{"variables": [${(config.protocols[0] ? getProtocolVariables(config.protocols[0]) : []).slice(0,3).map(v => `"${v.name}"`).join(', ') || '"HR_Variable_1", "HR_Variable_2"'}]}'`}</code></pre>
                            <pre><code>{`{
  "protocol": "${config.protocols[0]?.id ?? 'modbus-1'}",
  "values": {
    "${(config.protocols[0] ? getProtocolVariables(config.protocols[0]) : [])[0]?.name ?? 'HR_Variable_1'}": 1500,
    "${(config.protocols[0] ? getProtocolVariables(config.protocols[0]) : [])[1]?.name ?? 'HR_Variable_2'}": 320
  },
  "timestamp": "2026-02-26T10:00:00.000Z"
}`}</code></pre>
                          </div>
                        </div>
                      </details>

                      <details className="api-dropdown">
                        <summary>✍️ Variable Write Operations</summary>
                        <div className="dropdown-content">
                          <div className="api-endpoint">
                            <span className="method post">POST</span>
                            <code>/api/&#123;protocolId&#125;/variables/&#123;variableName&#125;</code>
                            <span className="description">Write single variable — body: <code>&#123;"value": ...&#125;</code></span>
                          </div>
                          <div className="example">
                            {(() => {
                              const writable = (config.protocols[0] ? getProtocolVariables(config.protocols[0]) : []).find(v => v.writable);
                              const exVal = writable?.dataType === 'boolean' ? 'true' : writable?.dataType === 'string' ? '"hello"' : '1500';
                              return (
                                <>
                                  <pre><code>{`curl -X POST http://${config.server.host}:${config.server.port}/api/${config.protocols[0]?.id ?? 'modbus-1'}/variables/${writable?.name ?? 'HR_Variable_1'} \\
  -H "Content-Type: application/json" \\
  -d '{"value": ${exVal}}'`}</code></pre>
                                  <pre><code>{`{
  "protocol": "${config.protocols[0]?.id ?? 'modbus-1'}",
  "variable": "${writable?.name ?? 'HR_Variable_1'}",
  "value": ${exVal},
  "success": true,
  "timestamp": "2026-02-26T10:00:00.000Z"
}`}</code></pre>
                                </>
                              );
                            })()}
                          </div>
                          <div className="api-endpoint">
                            <span className="method post">POST</span>
                            <code>/api/&#123;protocolId&#125;/variables/write</code>
                            <span className="description">Bulk write multiple variables — body: <code>&#123;"varName": value, ...&#125;</code> or use WebHMI Body Parameters</span>
                          </div>
                          <div className="example">
                            {(() => {
                              const writables = (config.protocols[0] ? getProtocolVariables(config.protocols[0]) : []).filter(v => v.writable).slice(0, 3);
                              const bodyEntries = writables.length > 0
                                ? writables.map(v => `"${v.name}": ${v.dataType === 'boolean' ? 'true' : v.dataType === 'string' ? '"hello"' : '1500'}`).join(',\n    ')
                                : '"HR_Variable_1": 1500,\n    "HR_Variable_2": 320';
                              const writtenCount = writables.length || 2;
                              return (
                                <>
                                  <pre><code>{`curl -X POST http://${config.server.host}:${config.server.port}/api/${config.protocols[0]?.id ?? 'modbus-1'}/variables/write \\
  -H "Content-Type: application/json" \\
  -d '{
    ${bodyEntries}
  }'`}</code></pre>
                                  <pre><code>{`{
  "protocol": "${config.protocols[0]?.id ?? 'modbus-1'}",
  "success": true,
  "written": ${writtenCount},
  "timestamp": "2026-02-26T10:00:00.000Z"
}`}</code></pre>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </details>

                      {config.protocols.length > 0 && (
                        <details className="api-dropdown">
                          <summary>🏷️ Available Variables by Protocol</summary>
                          <div className="dropdown-content">
                            {config.protocols.map((protocol, index) => (
                              <div key={index} className="protocol-variables">
                                <h6>📌 {protocol.name} ({protocol.type.toUpperCase()}) - ID: {protocol.id}</h6>
                                <div className="variable-examples">
                                  {getProtocolVariables(protocol).map((variable, idx) => (
                                    <div key={idx} className="variable-item">
                                      <code className="variable-name">{variable.name}</code>
                                      <span className="variable-type">{variable.dataType}</span>
                                      <span className={`variable-access ${variable.writable ? 'rw' : 'ro'}`}>
                                        {variable.writable ? 'R/W' : 'R/O'}
                                      </span>
                                      <span className="variable-description">{variable.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      <details className="api-dropdown">
                        <summary>️ Response Format</summary>
                        <div className="dropdown-content">
                          <div className="example">
                            <h6>✅ Successful Read Response:</h6>
                            <pre><code>{`{
  "protocol": "modbus-1",
  "variable": "HR_40001", 
  "device": "default",
  "value": 1500,
  "dataType": "int16",
  "quality": "good",
  "timestamp": "2026-02-05T10:30:00.000Z"
}`}</code></pre>
                          </div>
                          <div className="example">
                            <h6>❌ Error Response:</h6>
                            <pre><code>{`{
  "error": "Variable 'HR_99999' not found",
  "protocol": "modbus-1",
  "timestamp": "2026-02-05T10:30:00.000Z"
}`}</code></pre>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  const protocolIndex = config.protocols.findIndex(p => p.id === activeProtocolTab);
                  if (protocolIndex === -1) return <div>Protocol not found</div>;
                  const protocol = config.protocols[protocolIndex];
                  
                  return (
                    <div className="protocol-card">
                      <div className="protocol-header">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Name:</label>
                            <input
                              type="text"
                              value={protocol.name}
                              onChange={(e) => updateProtocol(protocolIndex, { name: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Type:</label>
                            <select
                              value={protocol.type}
                              onChange={(e) => {
                                const newType = e.target.value;
                                updateProtocol(protocolIndex, {
                                  type: newType,
                                  settings: getDefaultProtocolSettings(newType, protocol.mode)
                                });
                              }}
                            >
                              {protocolTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Mode:</label>
                            <select
                              value={protocol.mode}
                              onChange={(e) => {
                                const newMode = e.target.value as 'client' | 'server';
                                updateProtocol(protocolIndex, {
                                  mode: newMode,
                                  settings: getDefaultProtocolSettings(protocol.type, newMode)
                                });
                              }}
                            >
                              <option value="server">Server</option>
                              <option value="client">Client</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>
                              <input
                                type="checkbox"
                                checked={protocol.enabled}
                                onChange={(e) => updateProtocol(protocolIndex, { enabled: e.target.checked })}
                              />
                              Enabled
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              removeProtocol(protocolIndex);
                              // Switch to HTTP API tab if this was the active tab
                              setActiveProtocolTab('http-api');
                            }}
                            className="btn-remove"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: '6px 12px 10px', fontSize: '13px', color: '#bbb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#333' }}>Protocol ID:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#fff', background: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', padding: '2px 8px', userSelect: 'all', letterSpacing: '0.5px' }}>{protocol.id}</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>(used in API calls: /api/<strong style={{ color: '#999' }}>{protocol.id}</strong>/variables/...)</span>
                      </div>
                      
                      {/* Protocol-specific settings */}
                      <div className="protocol-settings">
                        <h4>Variable Configuration</h4>
                        
                        {protocol.type === 'modbus-tcp' ? (
                          <div className="modbus-config">
                            <div className="form-row">
                              <div className="form-group">
                                <label>Server Port:</label>
                                <input
                                  type="number"
                                  value={protocol.settings?.serverPort || 5020}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      serverPort: parseInt(e.target.value)
                                    }
                                  })}
                                />
                              </div>
                              <div className="form-group">
                                <label>Unit ID:</label>
                                <input
                                  type="number"
                                  value={protocol.settings?.unitId || 1}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      unitId: parseInt(e.target.value)
                                    }
                                  })}
                                />
                              </div>
                            </div>

                            {/* Register Configuration Tabs */}
                            <div className="register-tabs-container">
                              <div className="register-tabs-header">
                                <div className="header-content">
                                  <h5>Register Configuration</h5>
                                  {protocol.mode === 'client' && (
                                    <button
                                      type="button"
                                      className="btn-add-device"
                                      onClick={() => {
                                        const clients = protocol.settings?.clients || [];
                                        const newClient = {
                                          id: `client-${Date.now()}`,
                                          name: `Device ${clients.length + 1}`,
                                          ip: '192.168.1.100',
                                          port: 5020,
                                          unitId: clients.length + 1,
                                          enabled: true,
                                          timeout: 5000,
                                          retries: 3,
                                          cyclicEnabled: true,
                                          cyclicInterval: 1000,
                                          registerMappings: {
                                            holdingRegisters: [],
                                            inputRegisters: [],
                                            coils: [],
                                            discreteInputs: []
                                          }
                                        };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            clients: [...clients, newClient]
                                          }
                                        });
                                        // Set active tab to new client
                                        setActiveRegisterTab(prev => ({
                                          ...prev,
                                          [protocol.id]: newClient.id
                                        }));
                                      }}
                                    >
                                      + Add Client Device
                                    </button>
                                  )}
                                </div>
                                <div className="register-tabs">
                                  <button
                                    className={`register-tab ${(activeRegisterTab[protocol.id] || 'server-registers') === 'server-registers' ? 'active' : ''}`}
                                    onClick={() => setActiveRegisterTab(prev => ({...prev, [protocol.id]: 'server-registers'}))}
                                  >
                                    {protocol.mode === 'server' ? 'Server Registers' : 'Server Template'}
                                  </button>
                                  {protocol.mode === 'client' && (protocol.settings?.clients || []).map((client: any, clientIdx: number) => (
                                    <button
                                      key={client.id}
                                      className={`register-tab ${(activeRegisterTab[protocol.id] || 'server-registers') === client.id ? 'active' : ''}`}
                                      onClick={() => setActiveRegisterTab(prev => ({...prev, [protocol.id]: client.id}))}
                                    >
                                      <span>{client.name}</span>
                                      <span 
                                        className="tab-close-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const clients = protocol.settings?.clients || [];
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              clients: clients.filter((_: any, idx: number) => idx !== clientIdx)
                                            }
                                          });
                                          // Switch back to server registers tab
                                          setActiveRegisterTab(prev => ({
                                            ...prev,
                                            [protocol.id]: 'server-registers'
                                          }));
                                        }}
                                      >
                                        X
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Server Registers Tab Content */}
                              {(activeRegisterTab[protocol.id] || 'server-registers') === 'server-registers' && (
                                <div className="register-tab-content">
                                  <div className="server-registers-info">
                                    <p style={{fontSize: '0.75rem', color: '#666', marginBottom: '1rem'}}>
                                      {protocol.mode === 'server' 
                                        ? 'Configure the register ranges that your Modbus server will expose to external clients. External clients will connect and read/write to these addresses.'
                                        : 'Configure the register ranges that your Modbus server will expose to external clients. Client devices will populate these addresses with live data.'
                                      }
                                    </p>
                                  </div>

                            {/* Holding Registers */}
                            <div className="register-section">
                              <h5>Holding Registers (Read/Write)</h5>
                              <div className="form-row">
                                <div className="form-group">
                                  <label>Start Address:</label>
                                  <input
                                    type="number"
                                    value={protocol.settings?.registerMap?.holdingRegisters?.start ?? 0}
                                    onChange={(e) => {
                                      const newStart = parseInt(e.target.value);
                                      const variables = protocol.settings?.registerMap?.holdingRegisters?.variables || [];
                                      const updatedVariables = variables.map((v: any, idx: number) => ({
                                        ...v,
                                        address: newStart + idx
                                      }));
                                      updateProtocol(protocolIndex, {
                                        settings: {
                                          ...protocol.settings,
                                          registerMap: {
                                            ...protocol.settings?.registerMap,
                                            holdingRegisters: {
                                              ...protocol.settings?.registerMap?.holdingRegisters,
                                              start: newStart,
                                              variables: updatedVariables
                                            }
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Count:</label>
                                  <input
                                    type="number"
                                    value={protocol.settings?.registerMap?.holdingRegisters?.count ?? 0}
                                    onChange={(e) => {
                                      const newCount = parseInt(e.target.value);
                                      const start = protocol.settings?.registerMap?.holdingRegisters?.start ?? 0;
                                      const currentVariables = protocol.settings?.registerMap?.holdingRegisters?.variables || [];
                                      let newVariables = [...currentVariables];
                                      
                                      if (newCount > currentVariables.length) {
                                        // Add new variables
                                        for (let i = currentVariables.length; i < newCount; i++) {
                                          newVariables.push({
                                            name: `HR_Variable_${i + 1}`,
                                            address: start + i,
                                            description: `Holding Register ${start + i}`,
                                            comMode: 'write',
                                            trigger: 'api',
                                            cyclicMs: 1000
                                          });
                                        }
                                      } else {
                                        // Remove excess variables
                                        newVariables = newVariables.slice(0, newCount);
                                      }
                                      
                                      updateProtocol(protocolIndex, {
                                        settings: {
                                          ...protocol.settings,
                                          registerMap: {
                                            ...protocol.settings?.registerMap,
                                            holdingRegisters: {
                                              start,
                                              count: newCount,
                                              variables: newVariables
                                            }
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="variable-chart">
                                <div className={`variable-chart-header ${(activeRegisterTab[protocol.id] || 'server-registers') === 'server-registers' ? 'server-view' : ''}`}>
                                  <div>Variable Name</div>
                                  <div>Address</div>
                                  <div>Type</div>
                                  {(activeRegisterTab[protocol.id] || 'server-registers') !== 'server-registers' && (
                                    <>
                                      <div>Mode</div>
                                      <div>Trigger</div>
                                      <div>Cyclic (ms)</div>
                                    </>
                                  )}
                                  <div>Description</div>
                                </div>
                                {(protocol.settings?.registerMap?.holdingRegisters?.variables || []).map((variable: any, varIdx: number) => (
                                  <div key={varIdx} className={`variable-chart-row ${(activeRegisterTab[protocol.id] || 'server-registers') === 'server-registers' ? 'server-view' : ''}`}>
                                    <input
                                      type="text"
                                      value={variable.name}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.registerMap?.holdingRegisters?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, name: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            registerMap: {
                                              ...protocol.settings?.registerMap,
                                              holdingRegisters: {
                                                ...protocol.settings?.registerMap?.holdingRegisters,
                                                variables: updatedVariables
                                              }
                                            }
                                          }
                                        });
                                      }}
                                    />
                                    <input
                                      type="number"
                                      value={variable.address}
                                      readOnly
                                      className="readonly"
                                    />
                                    <div>int16</div>
                                    {(activeRegisterTab[protocol.id] || 'server-registers') !== 'server-registers' && (
                                      <select
                                        value={variable.comMode || 'write'}
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.registerMap?.holdingRegisters?.variables || [])];
                                          updatedVariables[varIdx] = { ...variable, comMode: e.target.value };
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              registerMap: {
                                                ...protocol.settings?.registerMap,
                                                holdingRegisters: {
                                                  ...protocol.settings?.registerMap?.holdingRegisters,
                                                  variables: updatedVariables
                                                }
                                              }
                                            }
                                          });
                                        }}
                                      >
                                        <option value="read">Read</option>
                                        <option value="write">Write</option>
                                        <option value="readwrite">Read/Write</option>
                                      </select>
                                    )}
                                    {(activeRegisterTab[protocol.id] || 'server-registers') !== 'server-registers' && (
                                      <>
                                        <select
                                          value={variable.trigger || 'api'}
                                          onChange={(e) => {
                                            const updatedVariables = [...(protocol.settings?.registerMap?.holdingRegisters?.variables || [])];
                                            updatedVariables[varIdx] = { ...variable, trigger: e.target.value };
                                            updateProtocol(protocolIndex, {
                                              settings: {
                                                ...protocol.settings,
                                                registerMap: {
                                                  ...protocol.settings?.registerMap,
                                                  holdingRegisters: {
                                                    ...protocol.settings?.registerMap?.holdingRegisters,
                                                    variables: updatedVariables
                                                  }
                                                }
                                              }
                                            });
                                          }}
                                        >
                                          <option value="api">API Trigger</option>
                                          <option value="cyclic">Cyclic</option>
                                        </select>
                                        <input
                                          type="number"
                                          value={variable.cyclicMs || 1000}
                                          disabled={variable.trigger !== 'cyclic'}
                                          onChange={(e) => {
                                            const updatedVariables = [...(protocol.settings?.registerMap?.holdingRegisters?.variables || [])];
                                            updatedVariables[varIdx] = { ...variable, cyclicMs: parseInt(e.target.value) };
                                            updateProtocol(protocolIndex, {
                                              settings: {
                                                ...protocol.settings,
                                                registerMap: {
                                                  ...protocol.settings?.registerMap,
                                                  holdingRegisters: {
                                                    ...protocol.settings?.registerMap?.holdingRegisters,
                                                    variables: updatedVariables
                                                  }
                                                }
                                              }
                                            });
                                          }}
                                        />
                                      </>
                                    )}
                                    <input
                                      type="text"
                                      value={variable.description}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.registerMap?.holdingRegisters?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, description: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            registerMap: {
                                              ...protocol.settings?.registerMap,
                                              holdingRegisters: {
                                                ...protocol.settings?.registerMap?.holdingRegisters,
                                                variables: updatedVariables
                                              }
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Input Registers */}
                            <div className="register-section">
                              <h5>Input Registers (Read Only)</h5>
                              <div className="form-row">
                                <div className="form-group">
                                  <label>Start Address:</label>
                                  <input
                                    type="number"
                                    value={protocol.settings?.registerMap?.inputRegisters?.start ?? 0}
                                    onChange={(e) => {
                                      const newStart = parseInt(e.target.value);
                                      const variables = protocol.settings?.registerMap?.inputRegisters?.variables || [];
                                      const updatedVariables = variables.map((v: any, idx: number) => ({
                                        ...v,
                                        address: newStart + idx
                                      }));
                                      updateProtocol(protocolIndex, {
                                        settings: {
                                          ...protocol.settings,
                                          registerMap: {
                                            ...protocol.settings?.registerMap,
                                            inputRegisters: {
                                              ...protocol.settings?.registerMap?.inputRegisters,
                                              start: newStart,
                                              variables: updatedVariables
                                            }
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Count:</label>
                                  <input
                                    type="number"
                                    value={protocol.settings?.registerMap?.inputRegisters?.count ?? 0}
                                    onChange={(e) => {
                                      const newCount = parseInt(e.target.value);
                                      const start = protocol.settings?.registerMap?.inputRegisters?.start ?? 0;
                                      const currentVariables = protocol.settings?.registerMap?.inputRegisters?.variables || [];
                                      let newVariables = [...currentVariables];
                                      
                                      if (newCount > currentVariables.length) {
                                        for (let i = currentVariables.length; i < newCount; i++) {
                                          newVariables.push({
                                            name: `IR_Variable_${i + 1}`,
                                            address: start + i,
                                            description: `Input Register ${start + i}`
                                          });
                                        }
                                      } else {
                                        newVariables = newVariables.slice(0, newCount);
                                      }
                                      
                                      updateProtocol(protocolIndex, {
                                        settings: {
                                          ...protocol.settings,
                                          registerMap: {
                                            ...protocol.settings?.registerMap,
                                            inputRegisters: {
                                              start,
                                              count: newCount,
                                              variables: newVariables
                                            }
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="variable-chart">
                                <div className="variable-chart-header">
                                  <div>Variable Name</div>
                                  <div>Address</div>
                                  <div>Type</div>
                                  <div>Description</div>
                                </div>
                                {(protocol.settings?.registerMap?.inputRegisters?.variables || []).map((variable: any, varIdx: number) => (
                                  <div key={varIdx} className="variable-chart-row">
                                    <input
                                      type="text"
                                      value={variable.name}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.registerMap?.inputRegisters?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, name: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            registerMap: {
                                              ...protocol.settings?.registerMap,
                                              inputRegisters: {
                                                ...protocol.settings?.registerMap?.inputRegisters,
                                                variables: updatedVariables
                                              }
                                            }
                                          }
                                        });
                                      }}
                                    />
                                    <input
                                      type="number"
                                      value={variable.address}
                                      readOnly
                                      className="readonly"
                                    />
                                    <div>int16</div>
                                    <input
                                      type="text"
                                      value={variable.description}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.registerMap?.inputRegisters?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, description: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            registerMap: {
                                              ...protocol.settings?.registerMap,
                                              inputRegisters: {
                                                ...protocol.settings?.registerMap?.inputRegisters,
                                                variables: updatedVariables
                                              }
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                              )}

                              {/* Client Device Tabs */}
                              {(protocol.settings?.clients || []).map((client: any, clientIdx: number) => (
                                activeRegisterTab[protocol.id] === client.id && (
                                  <div key={client.id} className="register-tab-content">
                                    <div className="client-tab-info">
                                      <h6>{client.name} Configuration</h6>
                                      <p style={{fontSize: '0.75rem', color: '#666', marginBottom: '1rem'}}>
                                        Configure connection settings and register mappings for this client device.
                                      </p>
                                    </div>

                                    {/* Client Connection Settings */}
                                    <div className="client-settings-section">
                                      <h6>Connection Settings</h6>
                                      <div className="form-row">
                                        <div className="form-group">
                                          <label>Device Name:</label>
                                          <input
                                            type="text"
                                            value={client.name}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, name: e.target.value };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                        <div className="form-group">
                                          <label>IP Address:</label>
                                          <input
                                            type="text"
                                            value={client.ip}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, ip: e.target.value };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="form-row">
                                        <div className="form-group">
                                          <label>Port:</label>
                                          <input
                                            type="number"
                                            value={client.port}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, port: parseInt(e.target.value) };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                        <div className="form-group">
                                          <label>Unit ID:</label>
                                          <input
                                            type="number"
                                            value={client.unitId}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, unitId: parseInt(e.target.value) };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="form-row">
                                        <div className="form-group">
                                          <label>Timeout (ms):</label>
                                          <input
                                            type="number"
                                            value={client.timeout}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, timeout: parseInt(e.target.value) };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                        <div className="form-group">
                                          <label>Retries:</label>
                                          <input
                                            type="number"
                                            value={client.retries}
                                            onChange={(e) => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              clients[clientIdx] = { ...client, retries: parseInt(e.target.value) };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Communication Mode */}
                                    <div className="communication-mode-section">
                                      <h6>Communication Mode</h6>
                                      <div className="communication-mode-options">
                                        <div className="communication-option">
                                          <label>
                                            <input
                                              type="radio"
                                              name={`comm-mode-${client.id}`}
                                              checked={client.cyclicEnabled}
                                              onChange={() => {
                                                const clients = [...(protocol.settings?.clients || [])];
                                                clients[clientIdx] = { ...client, cyclicEnabled: true };
                                                updateProtocol(protocolIndex, {
                                                  settings: {
                                                    ...protocol.settings,
                                                    clients
                                                  }
                                                });
                                              }}
                                            />
                                            Cyclic Polling
                                          </label>
                                          <div className="inline-field">
                                            <label>Interval (ms):</label>
                                            <input
                                              type="number"
                                              value={client.cyclicInterval}
                                              disabled={!client.cyclicEnabled}
                                              onChange={(e) => {
                                                const clients = [...(protocol.settings?.clients || [])];
                                                clients[clientIdx] = { ...client, cyclicInterval: parseInt(e.target.value) };
                                                updateProtocol(protocolIndex, {
                                                  settings: {
                                                    ...protocol.settings,
                                                    clients
                                                  }
                                                });
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <div className="communication-option">
                                          <label>
                                            <input
                                              type="radio"
                                              name={`comm-mode-${client.id}`}
                                              checked={!client.cyclicEnabled}
                                              onChange={() => {
                                                const clients = [...(protocol.settings?.clients || [])];
                                                clients[clientIdx] = { ...client, cyclicEnabled: false };
                                                updateProtocol(protocolIndex, {
                                                  settings: {
                                                    ...protocol.settings,
                                                    clients
                                                  }
                                                });
                                              }}
                                            />
                                            REST API Triggered
                                          </label>
                                          <div className="inline-description">
                                            Device will only be read/written when triggered via HTTP API calls
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Register Mappings */}
                                    <div className="client-register-mappings">
                                      <h6>Register Mappings</h6>
                                      <p style={{fontSize: '0.7rem', color: '#666', marginBottom: '1rem'}}>
                                        Map client device registers to server register addresses.
                                        Device Address = register on this client, Server Address = register in gateway server.
                                      </p>

                                      {/* Holding Registers Mapping */}
                                      <div className="register-type-section">
                                        <div className="register-type-header">
                                          <h6>Holding Registers (R/W)</h6>
                                          <button
                                            type="button"
                                            className="btn-add-mapping"
                                            onClick={() => {
                                              const clients = [...(protocol.settings?.clients || [])];
                                              const mappings = clients[clientIdx].registerMappings?.holdingRegisters || [];
                                              mappings.push({
                                                deviceAddress: 1001,
                                                serverAddress: 40001,
                                                count: 1,
                                                description: 'New Register',
                                                comMode: 'read',
                                                trigger: 'cyclic',
                                                cyclicMs: 1000
                                              });
                                              clients[clientIdx] = {
                                                ...client,
                                                registerMappings: {
                                                  ...client.registerMappings,
                                                  holdingRegisters: mappings
                                                }
                                              };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  clients
                                                }
                                              });
                                            }}
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        <div className="mapping-list">
                                          {(client.registerMappings?.holdingRegisters || []).map((mapping: any, mapIdx: number) => (
                                            <div key={mapIdx} className="mapping-row">
                                              <div className="mapping-inputs">
                                                <div className="form-group">
                                                  <label>Device Addr:</label>
                                                  <input
                                                    type="number"
                                                    value={mapping.deviceAddress}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, deviceAddress: parseInt(e.target.value) };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  />
                                                </div>
                                                <div className="form-group">
                                                  <label>Server Addr:</label>
                                                  <input
                                                    type="number"
                                                    value={mapping.serverAddress}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, serverAddress: parseInt(e.target.value) };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  />
                                                </div>
                                                <div className="form-group">
                                                  <label>Count:</label>
                                                  <input
                                                    type="number"
                                                    value={mapping.count}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, count: parseInt(e.target.value) };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  />
                                                </div>
                                                <div className="form-group">
                                                  <label>Description:</label>
                                                  <input
                                                    type="text"
                                                    value={mapping.description}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, description: e.target.value };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  />
                                                </div>
                                                <div className="form-group">
                                                  <label>Mode:</label>
                                                  <select
                                                    value={mapping.comMode || 'read'}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, comMode: e.target.value };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  >
                                                    <option value="read">Read</option>
                                                    <option value="write">Write</option>
                                                    <option value="readwrite">Read/Write</option>
                                                  </select>
                                                </div>
                                                <div className="form-group">
                                                  <label>Trigger:</label>
                                                  <select
                                                    value={mapping.trigger || 'cyclic'}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, trigger: e.target.value };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  >
                                                    <option value="api">API Trigger</option>
                                                    <option value="cyclic">Cyclic</option>
                                                  </select>
                                                </div>
                                                <div className="form-group">
                                                  <label>Interval (ms):</label>
                                                  <input
                                                    type="number"
                                                    value={mapping.cyclicMs || 1000}
                                                    disabled={mapping.trigger === 'api'}
                                                    onChange={(e) => {
                                                      const clients = [...(protocol.settings?.clients || [])];
                                                      const mappings = [...(clients[clientIdx].registerMappings?.holdingRegisters || [])];
                                                      mappings[mapIdx] = { ...mapping, cyclicMs: parseInt(e.target.value) };
                                                      clients[clientIdx] = {
                                                        ...client,
                                                        registerMappings: {
                                                          ...client.registerMappings,
                                                          holdingRegisters: mappings
                                                        }
                                                      };
                                                      updateProtocol(protocolIndex, {
                                                        settings: { ...protocol.settings, clients }
                                                      });
                                                    }}
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  className="btn-remove-mapping"
                                                  onClick={() => {
                                                    const clients = [...(protocol.settings?.clients || [])];
                                                    const mappings = clients[clientIdx].registerMappings?.holdingRegisters || [];
                                                    clients[clientIdx] = {
                                                      ...client,
                                                      registerMappings: {
                                                        ...client.registerMappings,
                                                        holdingRegisters: mappings.filter((_: any, idx: number) => idx !== mapIdx)
                                                      }
                                                    };
                                                    updateProtocol(protocolIndex, {
                                                      settings: { ...protocol.settings, clients }
                                                    });
                                                  }}
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        ) : protocol.type === 'opcua' ? (
                          <div className="opcua-config">
                            <div className="form-row">
                              <div className="form-group">
                                <label>Server Port:</label>
                                <input
                                  type="number"
                                  value={protocol.settings?.serverPort || 4840}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      serverPort: parseInt(e.target.value)
                                    }
                                  })}
                                />
                              </div>
                              <div className="form-group">
                                <label>Namespace:</label>
                                <input
                                  type="text"
                                  value={protocol.settings?.namespace || 'urn:gateway:opcua'}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      namespace: e.target.value
                                    }
                                  })}
                                />
                              </div>
                            </div>
                            
                            <div className="variable-section">
                              <h5>OPC UA Variables</h5>
                              <div className="variable-chart">
                                <div className="variable-chart-header">
                                  <div>Variable Name</div>
                                  <div>Data Type</div>
                                  <div>Node ID</div>
                                  <div>Description</div>
                                </div>
                                {(protocol.settings?.variables || []).map((variable: any, varIdx: number) => (
                                  <div key={varIdx} className="variable-chart-row">
                                    <input
                                      type="text"
                                      value={variable.name}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, name: e.target.value, nodeId: `ns=2;s=${e.target.value}` };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            variables: updatedVariables
                                          }
                                        });
                                      }}
                                    />
                                    <select
                                      value={variable.dataType}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, dataType: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            variables: updatedVariables
                                          }
                                        });
                                      }}
                                      style={{ fontSize: '0.7rem', padding: '0.125rem 0.25rem' }}
                                    >
                                      <option value="Boolean">Boolean</option>
                                      <option value="Int32">Int32</option>
                                      <option value="Double">Double</option>
                                      <option value="String">String</option>
                                    </select>
                                    <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>ns=2;s={variable.name}</div>
                                    <input
                                      type="text"
                                      value={variable.description}
                                      onChange={(e) => {
                                        const updatedVariables = [...(protocol.settings?.variables || [])];
                                        updatedVariables[varIdx] = { ...variable, description: e.target.value };
                                        updateProtocol(protocolIndex, {
                                          settings: {
                                            ...protocol.settings,
                                            variables: updatedVariables
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newVariable = {
                                    name: `Variable_${(protocol.settings?.variables?.length || 0) + 1}`,
                                    nodeId: `ns=2;s=Variable_${(protocol.settings?.variables?.length || 0) + 1}`,
                                    dataType: 'Double',
                                    description: 'New OPC UA Variable'
                                  };
                                  updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      variables: [...(protocol.settings?.variables || []), newVariable]
                                    }
                                  });
                                }}
                                className="btn-add-var"
                              >
                                Add Variable
                              </button>
                            </div>
                          </div>
                        ) : protocol.type === 'mqtt' ? (
                          <div className="mqtt-config">
                            <div className="connection-info">
                              <h5>🌍 MQTT Broker Connection Information</h5>
                              <div className="info-box">
                                <p><strong>TCP Connection:</strong> mqtt://&lt;your-server-ip&gt;:{protocol.settings?.brokerPort || 1883}</p>
                                <p><strong>WebSocket:</strong> ws://&lt;your-server-ip&gt;:{protocol.settings?.wsPort || 8883}</p>
                                <p><em>Replace &lt;your-server-ip&gt; with the actual IP address of the server running this gateway</em></p>
                              </div>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label>MQTT Broker Port:</label>
                                <input
                                  type="number"
                                  value={protocol.settings?.brokerPort || 1883}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      brokerPort: parseInt(e.target.value)
                                    }
                                  })}
                                />
                              </div>
                              <div className="form-group">
                                <label>WebSocket Port:</label>
                                <input
                                  type="number"
                                  value={protocol.settings?.wsPort || 8883}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      wsPort: parseInt(e.target.value)
                                    }
                                  })}
                                />
                              </div>
                            </div>

                            <div className="variables-section">
                              <div className="section-header">
                                <h5>MQTT Topics</h5>
                                <span className="variable-count">
                                  {(protocol.settings?.topics || []).length} topics configured
                                </span>
                              </div>
                              
                              <div className="info-box" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0' }}>
                                  📡 <strong>Topics do not need to be pre-configured</strong>, however, configured topics will be added to API templates. 
                                  Writing to a topic will send a message to the topic. Reading a topic will send the most recent message from that topic.
                                </p>
                              </div>
                              
                              {(protocol.settings?.topics || []).length > 0 && (
                                <table className="variables-table">
                                  <thead>
                                    <tr>
                                      <th>Topic</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(protocol.settings?.topics || []).map((topic: any, topicIndex: number) => (
                                      <tr key={topicIndex}>
                                        <td>
                                          <input
                                            type="text"
                                            value={topic.topic || ''}
                                            onChange={(e) => {
                                              const updatedTopics = [...(protocol.settings?.topics || [])];
                                              updatedTopics[topicIndex] = { ...topic, topic: e.target.value };
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  topics: updatedTopics
                                                }
                                              });
                                            }}
                                            placeholder="sensor/temperature"
                                            style={{ fontSize: '0.7rem', padding: '0.125rem 0.25rem', width: '100%' }}
                                          />
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedTopics = (protocol.settings?.topics || []).filter((_: any, i: number) => i !== topicIndex);
                                              updateProtocol(protocolIndex, {
                                                settings: {
                                                  ...protocol.settings,
                                                  topics: updatedTopics
                                                }
                                              });
                                            }}
                                            className="btn-remove-var"
                                            style={{ fontSize: '0.7rem', padding: '0.125rem 0.25rem' }}
                                          >
                                            Remove
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const newTopic = {
                                    topic: `topic/${(protocol.settings?.topics || []).length + 1}`,
                                    dataType: 'string',
                                    writable: true
                                  };
                                  updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      topics: [...(protocol.settings?.topics || []), newTopic]
                                    }
                                  });
                                }}
                                className="btn-add-var"
                              >
                                Add Topic
                              </button>
                            </div>
                          </div>
                        ) : protocol.type === 'midi' ? (
                          <div className="midi-config">
                            <div className="form-row">
                              <div className="form-group">
                                <label>Auto-Learn Messages:</label>
                                <select
                                  value={protocol.settings?.autoLearn !== false ? 'true' : 'false'}
                                  onChange={(e) => updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      autoLearn: e.target.value === 'true'
                                    }
                                  })}
                                >
                                  <option value="true">Enabled - Auto-capture new MIDI messages</option>
                                  <option value="false">Disabled - Only use configured variables</option>
                                </select>
                              </div>
                            </div>

                            <div className="variables-section">
                              <div className="section-header">
                                <h5>MIDI Variables</h5>
                                <span className="variable-count">
                                  {(protocol.settings?.variables || []).length} variables configured
                                </span>
                              </div>
                              
                              <div className="connection-info">
                                <div className="info-box">
                                  <p><strong>Connect your MIDI USB device</strong> and click the button below to auto-populate variables.</p>
                                  <p>Play notes, move knobs/faders, or press buttons on your MIDI controller to capture them as variables.</p>
                                  <p><em>Each unique MIDI message will be captured and made available via the REST API.</em></p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '15px' }}>
                                  <button
                                    type="button"
                                    onClick={() => connectToMidi(protocolIndex)}
                                    disabled={midiConnecting}
                                    style={{
                                      padding: '10px 20px',
                                      fontSize: '16px',
                                      backgroundColor: midiConnecting ? '#ccc' : '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: midiConnecting ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    {midiConnecting ? 'Listening...' : 'Connect to MIDI Device'}
                                  </button>
                                  {(midiConnecting || midiDevices.inputs.length > 0) && (
                                    <button
                                      type="button"
                                      onClick={disconnectFromMidi}
                                      style={{
                                        padding: '10px 20px',
                                        fontSize: '16px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Disconnect
                                    </button>
                                  )}
                                </div>
                                {midiDevices.inputs.length > 0 && (
                                  <div style={{ marginTop: '10px', marginBottom: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                                    <strong>Connected Devices:</strong>
                                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                      {midiDevices.inputs.map((device, idx) => (
                                        <li key={idx}>{device}</li>
                                      ))}
                                    </ul>
                                    <small>Play your MIDI controller to capture variables!</small>
                                  </div>
                                )}
                              </div>
                              
                              <div className="info-box" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#856404' }}>
                                  <strong>Auto-learn or Manual Configuration:</strong> Use "Connect to MIDI Device" above to auto-capture MIDI messages, or manually add variables below. With auto-learn enabled in the gateway, new messages will be automatically captured at runtime.
                                </p>
                              </div>
                              
                              {(protocol.settings?.variables || []).length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ccc' }}>
                                  <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>No MIDI variables configured yet</p>
                                  <p style={{ fontSize: '0.9rem', color: '#888', margin: 0 }}>Click "Connect to MIDI Device" above and play your controller to auto-populate variables</p>
                                </div>
                              ) : (
                                <div className="variable-chart">
                                  <div className="variable-chart-header">
                                    <div>Variable Name</div>
                                    <div>Message Type</div>
                                    <div>Channel</div>
                                    <div>Note/CC</div>
                                    <div>Description</div>
                                    <div></div>
                                  </div>
                                  {(protocol.settings?.variables || []).map((variable: any, varIdx: number) => (
                                    <div key={varIdx} className="variable-chart-row">
                                      <input
                                        type="text"
                                        value={variable.name}
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.variables || [])];
                                          updatedVariables[varIdx] = { ...variable, name: e.target.value };
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                        placeholder="Variable_1"
                                      />
                                      <select
                                        value={variable.messageType || 'note_on'}
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.variables || [])];
                                          updatedVariables[varIdx] = { ...variable, messageType: e.target.value };
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                      >
                                        <option value="note_on">Note On</option>
                                        <option value="note_off">Note Off</option>
                                        <option value="control_change">Control Change</option>
                                        <option value="pitchwheel">Pitch Wheel</option>
                                        <option value="aftertouch">Aftertouch</option>
                                        <option value="program_change">Program Change</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={variable.channel !== undefined ? variable.channel : 'any'}
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.variables || [])];
                                          const val = e.target.value.toLowerCase();
                                          updatedVariables[varIdx] = { ...variable, channel: val === 'any' ? undefined : parseInt(val) };
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                        placeholder="0-15 or any"
                                      />
                                      <input
                                        type="text"
                                        value={
                                          variable.messageType === 'control_change' 
                                            ? (variable.controller !== undefined ? variable.controller : 'any')
                                            : (variable.note !== undefined ? variable.note : 'any')
                                        }
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.variables || [])];
                                          const val = e.target.value.toLowerCase();
                                          const numVal = val === 'any' ? undefined : parseInt(val);
                                          
                                          if (variable.messageType === 'control_change') {
                                            updatedVariables[varIdx] = { ...variable, controller: numVal };
                                          } else {
                                            updatedVariables[varIdx] = { ...variable, note: numVal };
                                          }
                                          
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                        placeholder="0-127 or any"
                                      />
                                      <input
                                        type="text"
                                        value={variable.description || ''}
                                        onChange={(e) => {
                                          const updatedVariables = [...(protocol.settings?.variables || [])];
                                          updatedVariables[varIdx] = { ...variable, description: e.target.value };
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                        placeholder="Description"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedVariables = (protocol.settings?.variables || []).filter((_: any, i: number) => i !== varIdx);
                                          updateProtocol(protocolIndex, {
                                            settings: {
                                              ...protocol.settings,
                                              variables: updatedVariables
                                            }
                                          });
                                        }}
                                        style={{ 
                                          fontSize: '1rem', 
                                          padding: '0.125rem 0.4rem',
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          lineHeight: '1'
                                        }}
                                        title="Delete this variable"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const newVariable = {
                                    name: `MIDI_Variable_${(protocol.settings?.variables?.length || 0) + 1}`,
                                    messageType: 'note_on',
                                    channel: 0,
                                    note: 60,
                                    dataType: 'int',
                                    description: 'New MIDI Variable'
                                  };
                                  updateProtocol(protocolIndex, {
                                    settings: {
                                      ...protocol.settings,
                                      variables: [...(protocol.settings?.variables || []), newVariable]
                                    }
                                  });
                                }}
                                className="btn-add-var"
                              >
                                Add Variable
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="generic-settings">
                            <h5>Settings</h5>
                            <pre>{JSON.stringify(protocol.settings, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatewayBuilder;