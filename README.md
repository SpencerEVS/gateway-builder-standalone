# Industrial Gateway Builder

A React-based configuration tool for generating executable industrial protocol gateways.

## What it does

This application allows you to visually configure industrial protocol gateways and generates a complete Node.js server project that can be built into a Windows executable (.exe) file.

## How to use

### 1. Run the Gateway Builder Interface
```bash
npm install
npm start
```

This starts the React configuration interface on `http://localhost:3001`

### 2. Configure Your Gateway
- Set up basic settings (name, version, description)
- Add and configure protocols (Modbus TCP, OPC UA, MQTT, etc.)
- Configure server settings
- Set logging preferences

### 3. Generate Gateway Files
- Click "Generate Gateway" to download a ZIP file containing your configured gateway server code
- Extract the ZIP file to a new folder

### 4. Build the Executable
Navigate to the extracted folder and run:
```bash
npm install
npm run build-exe
```

This will create a Windows executable file that contains your configured industrial gateway server.

## Supported Protocols

- Modbus TCP/RTU
- OPC UA
- MQTT
- PROFINET
- EtherNet/IP
- BACnet
- DNP3
- IEC 61850

## Requirements

- Node.js 16 or later
- Windows (for executable generation)

## Note

The Gateway Builder interface itself is a React application for configuration only. The actual executable is generated from the Node.js server code that gets downloaded as a ZIP file.