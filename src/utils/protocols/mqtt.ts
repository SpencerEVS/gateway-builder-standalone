import { GatewayConfig } from '../gatewayGenerator';

export function generateMqttHandler(config: GatewayConfig): string {
  return `const mqtt = require('mqtt');
const Aedes = require('aedes');
const net = require('net');
const ws = require('ws');

class MqttHandler {
  constructor(protocolConfig, logger) {
    this.config = protocolConfig;
    this.logger = logger;
    this.topicBuffers = new Map(); // Store buffered messages per topic
    this.maxBufferSize = 10; // Maximum messages per topic buffer
    this.broker = null;
    this.server = null;
    this.wsServer = null;
    this.clients = new Set();
    this.initialize();
  }

  async initialize() {
    if (!this.config.enabled) {
      this.logger.info('🚫 MQTT protocol is disabled');
      return true;
    }

    try {
      this.logger.info('🚀 Initializing MQTT Broker with dynamic topic buffering...');
      
      if (this.config.mode === 'server') {
        await this.startMqttBroker();
      }

      this.logger.info('✅ MQTT protocol handler initialized successfully');
      return true;

    } catch (error) {
      this.logger.error('❌ Failed to initialize MQTT protocol handler:', error);
      return false;
    }
  }

  async startMqttBroker() {
    const brokerPort = this.config.settings?.brokerPort || 1883;
    const wsPort = this.config.settings?.wsPort || 8883;
    
    this.logger.info(\`🔧 Starting MQTT Broker on port \${brokerPort}...\`);
    this.logger.info(\`🌐 WebSocket MQTT on port \${wsPort}...\`);

    // Create Aedes broker instance
    this.broker = new Aedes({
      id: 'gateway-mqtt-broker',
      heartbeatInterval: 60000,
      connectTimeout: 30000
    });

    // Set up broker event handlers
    this.setupBrokerEvents();

    // Create TCP server for MQTT
    this.server = net.createServer(this.broker.handle);
    
    // Create WebSocket server for MQTT over WebSocket
    this.wsServer = new ws.Server({ port: wsPort });
    this.wsServer.on('connection', (ws) => {
      const stream = ws.createStream();
      this.broker.handle(stream);
    });

    // Start the TCP server
    return new Promise((resolve, reject) => {
      this.server.listen(brokerPort, (err) => {
        if (err) {
          this.logger.error(\`❌ Failed to start MQTT broker: \${err.message}\`);
          reject(err);
        } else {
          this.logger.info(\`✅ MQTT Broker started on port \${brokerPort}\`);
          this.logger.info(\`✅ MQTT WebSocket started on port \${wsPort}\`);
          this.logger.info(\`🌍 Clients can connect to mqtt://localhost:\${brokerPort}\`);
          this.logger.info(\`🌍 WebSocket clients can connect to ws://localhost:\${wsPort}\`);
          resolve();
        }
      });
    });
  }

  setupBrokerEvents() {
    this.broker.on('client', (client) => {
      this.clients.add(client.id);
      this.logger.info(\`🔗 MQTT client connected: \${client.id}\`);
    });

    this.broker.on('clientDisconnect', (client) => {
      this.clients.delete(client.id);
      this.logger.info(\`🔌 MQTT client disconnected: \${client.id}\`);
    });

    this.broker.on('subscribe', (subscriptions, client) => {
      subscriptions.forEach(sub => {
        this.logger.info(\`📡 Client \${client.id} subscribed to: \${sub.topic}\`);
      });
    });

    this.broker.on('unsubscribe', (unsubscriptions, client) => {
      unsubscriptions.forEach(topic => {
        this.logger.info(\`📡 Client \${client.id} unsubscribed from: \${topic}\`);
      });
    });

    this.broker.on('publish', (packet, client) => {
      const clientId = client ? client.id : 'server';
      const topic = packet.topic;
      const payload = packet.payload.toString();
      
      this.logger.info(\`📤 MQTT publish from \${clientId}: \${topic} = \${payload}\`);
      
      // Buffer the message for any topic dynamically
      this.bufferMessage(topic, {
        topic: topic,
        payload: payload,
        timestamp: new Date().toISOString(),
        clientId: clientId,
        qos: packet.qos || 0,
        retain: packet.retain || false
      });
    });
  }

  bufferMessage(topic, message) {
    // Initialize buffer for topic if it doesn't exist
    if (!this.topicBuffers.has(topic)) {
      this.topicBuffers.set(topic, []);
    }

    const buffer = this.topicBuffers.get(topic);
    
    // Add new message to buffer
    buffer.push(message);
    
    // Keep only the last maxBufferSize messages
    if (buffer.length > this.maxBufferSize) {
      buffer.shift(); // Remove oldest message
    }
    
    this.logger.debug(\`📦 Buffered message for topic '\${topic}' (buffer size: \${buffer.length})\`);
  }

  getTopicMessages(topicFilter) {
    const matchingMessages = [];
    const topicsToEmpty = [];
    
    // Find all topics that contain the filter string
    for (const [topic, buffer] of this.topicBuffers.entries()) {
      if (topic.includes(topicFilter)) {
        matchingMessages.push({
          topic: topic,
          messages: [...buffer] // Copy the buffer
        });
        topicsToEmpty.push(topic);
      }
    }
    
    // Clear the buffers for matching topics
    topicsToEmpty.forEach(topic => {
      this.topicBuffers.set(topic, []);
      this.logger.info(\`🗑️ Cleared buffer for topic '\${topic}' after retrieval\`);
    });
    
    this.logger.info(\`📊 Retrieved \${matchingMessages.length} topic buffers for filter '\${topicFilter}'\`);
    return {
      filter: topicFilter,
      topics: matchingMessages,
      timestamp: new Date().toISOString()
    };
  }

  getVariableList() {
    // Return list of currently buffered topics
    const topics = Array.from(this.topicBuffers.keys());
    return topics.map(topic => ({
      name: topic,
      topic: topic,
      dataType: 'string',
      readable: true,
      writable: true,
      bufferSize: this.topicBuffers.get(topic).length
    }));
  }

  readVariable(variableName, deviceName) {
    // Return latest message from topic buffer
    const buffer = this.topicBuffers.get(variableName);
    if (!buffer || buffer.length === 0) {
      return {
        value: null,
        dataType: 'string',
        quality: 'bad',
        timestamp: new Date().toISOString(),
        error: \`No messages in buffer for topic '\${variableName}'\`
      };
    }

    const latestMessage = buffer[buffer.length - 1];
    this.logger.info(\`📖 Reading latest MQTT message from topic: \${variableName}\`);

    return {
      value: latestMessage.payload,
      dataType: 'string',
      quality: 'good',
      timestamp: latestMessage.timestamp,
      topic: latestMessage.topic
    };
  }

  writeVariable(variableName, value, deviceName) {
    try {
      // Publish to MQTT broker if running (topic = variableName)
      if (this.broker) {
        const packet = {
          topic: variableName,
          payload: Buffer.from(String(value)),
          qos: 0,
          retain: true
        };
        
        this.broker.publish(packet, () => {
          this.logger.info(\`📤 MQTT published: \${variableName} = \${value}\`);
        });
        
        return {
          success: true,
          message: \`Successfully published \${value} to MQTT topic \${variableName}\`
        };
      } else {
        throw new Error('MQTT broker not running');
      }
      
    } catch (error) {
      this.logger.error(\`MQTT write error for \${variableName}:\`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  getData(deviceName) {
    const topicCount = this.topicBuffers.size;
    let totalMessages = 0;
    
    for (const buffer of this.topicBuffers.values()) {
      totalMessages += buffer.length;
    }
    
    return { 
      message: 'MQTT Broker ready - accepting messages on any topic',
      connected: true,
      topicCount: topicCount,
      totalBufferedMessages: totalMessages,
      clientCount: this.clients.size,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    this.logger.info('🔌 Shutting down MQTT Handler...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.broker) {
      await new Promise(resolve => this.broker.close(resolve));
    }
    
    this.logger.info('✅ MQTT Handler shutdown complete');
  }

  writeData() { 
    this.logger.info('📤 MQTT broker ready for publishes'); 
  }

  close() { 
    this.shutdown();
  }
}

module.exports = MqttHandler;
`;
}