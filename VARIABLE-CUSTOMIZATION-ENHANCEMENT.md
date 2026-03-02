# Variable Customization Enhancement

## 🎯 Overview

The Gateway Builder now includes comprehensive variable customization capabilities, allowing users to define custom variable names, configure register counts, and manage protocol-specific variable settings through an intuitive web interface.

## ✨ New Features Added

### 🔧 **Interactive Variable Editor**

#### **Modbus TCP/RTU Configuration:**
- **Custom Variable Names** - Replace generic HR_40001 with meaningful names like "Temperature_SP"
- **Dynamic Register Counts** - Adjust number of holding/input registers, coils, and discrete inputs
- **Address Management** - Automatic address calculation based on start address and count
- **Variable Descriptions** - Add descriptive text for each variable
- **Real-time Preview** - See variable changes reflected in REST API documentation

#### **OPC UA Configuration:**
- **Custom Node Variables** - Define variables with custom names and Node IDs
- **Data Type Selection** - Choose from Boolean, Int32, Double, String
- **Dynamic Variable Management** - Add/remove variables with live updates
- **Auto Node ID Generation** - Automatically generates ns=2;s={VariableName} format

### 📊 **Enhanced Configuration Structure**

#### **Modbus Enhanced Settings:**
```javascript
{
  registerMap: {
    holdingRegisters: {
      start: 40001,
      count: 10,
      variables: [
        { name: "Temperature_SP", address: 40001, description: "Temperature Setpoint" },
        { name: "Pressure_SP", address: 40002, description: "Pressure Setpoint" }
      ]
    },
    inputRegisters: {
      start: 30001,
      count: 10, 
      variables: [
        { name: "Temperature_PV", address: 30001, description: "Temperature Process Value" }
      ]
    }
  }
}
```

#### **OPC UA Enhanced Settings:**
```javascript
{
  variables: [
    { 
      name: "Temperature", 
      nodeId: "ns=2;s=Temperature", 
      dataType: "Double", 
      description: "Process Temperature" 
    }
  ]
}
```

### 🎨 **User Interface Enhancements**

#### **Variable Editor Sections:**
- **Modbus Registers:**
  - Holding Registers (Read/Write)
  - Input Registers (Read Only) 
  - Coils (Boolean R/W)
  - Discrete Inputs (Boolean R/O)

- **OPC UA Variables:**
  - Name/Node ID configuration
  - Data type selection
  - Add/Remove variable controls

#### **Smart Controls:**
- **Count Adjustment** - Automatically adds/removes variables when count changes
- **Address Recalculation** - Updates all addresses when start address changes
- **Live Validation** - Immediate feedback on configuration changes
- **Responsive Design** - Clean, organized interface with proper spacing

### 🔄 **Dynamic REST API Updates**

#### **Real-Time Documentation:**
- **Variable Names** - REST API examples update with custom variable names
- **Protocol-Specific** - Different variable sets shown for each protocol type
- **Live Examples** - curl commands reflect actual configured variables

#### **Enhanced Variable Display:**
```
📌 Modbus TCP Gateway (modbus-tcp) - ID: modbus-1

Temperature_SP     │ int16   │ R/W │ Temperature Setpoint
Pressure_SP        │ int16   │ R/W │ Pressure Setpoint  
Temperature_PV     │ int16   │ R/O │ Temperature Process Value
Motor_Start        │ boolean │ R/W │ Motor Start Command
```

### 🛠 **Generated Gateway Improvements**

#### **Custom Variable Integration:**
- **Handler Updates** - Protocol handlers use configured variable names
- **REST API Mapping** - API endpoints work with custom variable names
- **Backward Compatibility** - Fallback to generic names if custom config missing
- **Description Metadata** - Variable descriptions included in API responses

## 📖 **Usage Examples**

### **Configure Custom Modbus Variables:**
1. **Select Protocol Type:** Modbus TCP
2. **Set Register Counts:** Adjust holding registers from 10 to 20
3. **Customize Names:** Change "HR_Variable_1" to "Reactor_Temperature"
4. **Add Descriptions:** "Primary reactor temperature setpoint"
5. **See Live Updates:** REST API documentation updates automatically

### **Generate with Custom Variables:**
```bash
# Read custom variable
curl http://localhost:8080/api/modbus-1/variables/Reactor_Temperature

# Write to custom variable  
curl -X POST http://localhost:8080/api/modbus-1/variables/Motor_Speed_SP \
  -d '{"value": 1500}' -H "Content-Type: application/json"
```

### **OPC UA Custom Variables:**
1. **Add New Variable:** Click "Add Variable"
2. **Set Name:** "Reactor_Pressure" 
3. **Choose Type:** Double
4. **Auto Node ID:** ns=2;s=Reactor_Pressure
5. **Add Description:** "Primary reactor pressure reading"

## 🎯 **Benefits**

### **For Industrial Applications:**
✅ **Meaningful Names** - Use actual equipment tags and process variables  
✅ **Flexible Scaling** - Adjust variable counts to match real hardware  
✅ **Professional APIs** - Generate REST APIs with industry-standard variable names  
✅ **Documentation** - Built-in descriptions for maintenance and integration  

### **For Integration:**
✅ **Self-Documenting** - Variable names and descriptions in API responses  
✅ **Scalable** - Easy to add/remove variables as systems grow  
✅ **Type Safety** - Proper data type validation and conversion  
✅ **Real-time Preview** - See exactly what API will be available  

### **For Development:**
✅ **Live Updates** - Changes immediately reflected in interface  
✅ **Visual Feedback** - Clear indication of read-only vs read-write variables  
✅ **Error Prevention** - Address conflicts and validation built-in  
✅ **Copy-Paste Ready** - Examples use actual configured variables  

---

**This enhancement transforms the Gateway Builder from a template-based tool into a fully customizable industrial variable configuration system, enabling users to create gateways perfectly tailored to their specific industrial applications and naming conventions.**