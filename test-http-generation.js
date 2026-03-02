// Test HTTP API generation
const { generateServerFiles } = require('./src/utils/gatewayGenerator.ts');

async function testHttpApiGeneration() {
  console.log('🧪 Testing HTTP API generation...');

  // Create a test configuration similar to what the UI would generate
  const testConfig = {
    name: "Test Gateway",
    description: "Test gateway for HTTP API",
    version: "1.0.0",
    protocols: [{
      id: "modbus-test-1",
      name: "Test Modbus Server",
      type: "modbus-tcp",
      enabled: true,
      mode: "server",
      settings: {
        serverPort: 502,
        unitId: 1,
        registerMap: {
          holdingRegisters: {
            start: 0,
            count: 3,
            variables: [
              { name: 'Data_0', address: 0, dataType: 'uint16', comMode: 'readwrite', description: 'Test register 0' },
              { name: 'Data_1', address: 1, dataType: 'uint16', comMode: 'readwrite', description: 'Test register 1' },
              { name: 'Data_2', address: 2, dataType: 'uint16', comMode: 'readwrite', description: 'Test register 2' }
            ]
          }
        }
      }
    }],
    server: {
      port: 8080,
      host: "localhost",
      ssl: false,
      authentication: false
    },
    logging: {
      level: "info",
      file: false,
      console: true
    }
  };

  try {
    console.log('📝 Generating server files...');
    const files = await generateServerFiles(testConfig);
    
    console.log('✅ Generated files:');
    Object.keys(files).forEach(filename => {
      if (filename !== 'zipBuffer') {
        console.log(`   📄 ${filename} (${files[filename].length} chars)`);
      }
    });

    // Check if server.js contains HTTP API endpoints
    const serverJs = files['server.js'];
    const hasHealthEndpoint = serverJs.includes("app.get('/health'");
    const hasApiEndpoints = serverJs.includes("app.get('/api/protocols'");
    const hasVariableEndpoints = serverJs.includes("app.get('/api/:protocol/variables/:variable'");
    
    console.log('\n🔍 HTTP API Analysis:');
    console.log(`   Health endpoint: ${hasHealthEndpoint ? '✅' : '❌'}`);
    console.log(`   Protocol discovery: ${hasApiEndpoints ? '✅' : '❌'}`);
    console.log(`   Variable endpoints: ${hasVariableEndpoints ? '✅' : '❌'}`);

    if (hasHealthEndpoint && hasApiEndpoints && hasVariableEndpoints) {
      console.log('\n🎉 HTTP API generation looks correct!');
    } else {
      console.log('\n⚠️ HTTP API generation may have issues!');
    }

    // Save server.js for inspection
    const fs = require('fs');
    fs.writeFileSync('test-generated-server.js', serverJs);
    console.log('\n📄 Saved generated server to test-generated-server.js for inspection');

  } catch (error) {
    console.error('❌ Error generating server files:', error);
  }
}

testHttpApiGeneration();