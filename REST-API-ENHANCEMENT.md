# Gateway Builder REST API Enhancement

## 🎯 Overview

The Gateway Builder now generates industrial protocol gateways with comprehensive REST API endpoints for reading and writing protocol variables. This enables easy integration with web applications, HMI systems, and other industrial software.

## ✨ New Features Added

### 🔌 Enhanced Protocol Handlers
All protocol handlers now support:
- **Variable Management** - Organized variable storage with metadata
- **Read Operations** - Single and bulk variable reading  
- **Write Operations** - Single and bulk variable writing
- **Data Validation** - Type checking and value validation
- **Error Handling** - Comprehensive error reporting

### 📡 REST API Endpoints

#### Discovery Endpoints
- `GET /health` - Server health and protocol status
- `GET /api/protocols` - List all protocols and their variables

#### Variable Operations  
- `GET /api/{protocol}/variables/{variable}` - Read single variable
- `POST /api/{protocol}/variables/{variable}` - Write single variable
- `POST /api/{protocol}/variables/read` - Bulk read variables
- `POST /api/{protocol}/variables/write` - Bulk write variables

### 🏷️ Variable Naming Conventions

**Modbus TCP/RTU:**
- Holding Registers: `HR_40001`, `HR_40002`, etc.
- Input Registers: `IR_30001`, `IR_30002`, etc.  
- Coils: `C_1`, `C_2`, etc.
- Discrete Inputs: `DI_10001`, `DI_10002`, etc.

**OPC UA:**
- Named variables: `Temperature`, `Pressure`, `Running`, `Speed`, `SetPoint`
- With corresponding Node IDs: `ns=2;s=Temperature`

**MQTT:**
- Topic-based: `sensor/temperature`, `sensor/humidity`, `device/status`, `control/setpoint`

**PROFINET:**
- Module-based: `InputModule_1/Channel_1`, `AnalogInput_1/Value`, `OutputModule_1/Channel_1`

## 📖 Usage Examples

### Read a Modbus Holding Register
```bash
curl http://localhost:8080/api/modbus-1/variables/HR_40001
```

**Response:**
```json
{
  "protocol": "modbus-1",
  "variable": "HR_40001",
  "device": "default", 
  "value": 1500,
  "dataType": "int16",
  "quality": "good",
  "timestamp": "2026-02-05T10:30:00.000Z",
  "address": 40001,
  "type": "holdingRegister"
}
```

### Write to an OPC UA Variable
```bash
curl -X POST http://localhost:8080/api/opcua-1/variables/Temperature \
  -H "Content-Type: application/json" \
  -d '{"value": 25.7}'
```

**Response:**
```json
{
  "protocol": "opcua-1",
  "variable": "Temperature",
  "device": "default",
  "value": 25.7,
  "success": true,
  "message": "Successfully wrote 25.7 to OPC UA variable Temperature",
  "timestamp": "2026-02-05T10:31:15.000Z"
}
```

### Bulk Read Multiple Variables
```bash
curl -X POST http://localhost:8080/api/modbus-1/variables/read \
  -H "Content-Type: application/json" \
  -d '{"variables": ["HR_40001", "HR_40002", "C_1"]}'
```

### Get All Available Protocols
```bash
curl http://localhost:8080/api/protocols
```

**Response:**
```json
{
  "protocols": [
    {
      "id": "modbus-1",
      "name": "Modbus TCP Gateway", 
      "type": "modbus-tcp",
      "mode": "server",
      "enabled": true,
      "variables": [
        {
          "name": "HR_40001",
          "address": 40001,
          "type": "holdingRegister",
          "dataType": "int16",
          "readable": true,
          "writable": true
        }
      ]
    }
  ]
}
```

## 🔧 Protocol-Specific Features

### Modbus TCP/RTU
- **Address Mapping** - Variables mapped to standard Modbus address ranges
- **Data Types** - int16 for registers, boolean for coils/discrete inputs  
- **Validation** - Range checking for register values (-32768 to 32767)
- **Client/Server Mode** - Support for both gateway modes

### OPC UA  
- **Named Variables** - Industrial standard variable names
- **Multiple Data Types** - boolean, int32, double, string
- **Node ID Mapping** - Variables linked to OPC UA Node IDs
- **Quality Attributes** - Good/bad quality indication

### MQTT
- **Topic-based Variables** - Variables represent MQTT topics
- **Publish/Subscribe** - Read simulates subscribe, write simulates publish
- **Quality of Service** - Topic metadata includes QoS information
- **Data Types** - Support for boolean, double, string values

### PROFINET
- **Module Structure** - Variables organized by I/O modules and channels
- **I/O Types** - Digital inputs/outputs, analog inputs/outputs
- **Range Validation** - Analog values validated (0-4095 for 12-bit)
- **Diagnostics** - Device status and diagnostic information

## 🛡️ Error Handling

### HTTP Status Codes
- **200** - Successful operation
- **400** - Bad request (invalid parameters)
- **404** - Protocol or variable not found
- **501** - Operation not supported (e.g., writing to read-only variable)
- **500** - Internal server error

### Error Response Format
```json
{
  "error": "Variable 'HR_99999' not found",
  "protocol": "modbus-1",
  "timestamp": "2026-02-05T10:32:00.000Z"
}
```

## 🚀 Integration Benefits

### HMI/SCADA Integration
- Standard REST API for any web-based HMI
- Real-time variable access via HTTP requests
- JSON data format for easy parsing

### IoT Platform Integration  
- RESTful interface compatible with most IoT platforms
- MQTT-style variable access for IoT applications
- Cloud integration capabilities

### Custom Applications
- Easy integration with any programming language
- Standard HTTP protocols - no special libraries needed
- Comprehensive documentation generated automatically

## 📊 Generated Documentation

Each generated gateway includes:
- **Complete REST API documentation** in README.md
- **Variable reference** with naming conventions  
- **Example requests** for all endpoints
- **Error code reference** for troubleshooting
- **Protocol-specific guides** for each enabled protocol

---

**This enhancement makes the Gateway Builder a powerful tool for creating industrial protocol gateways with modern REST API interfaces, enabling seamless integration with web applications, HMI systems, and IoT platforms.**