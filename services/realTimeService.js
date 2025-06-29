// const { Server } = require("socket.io");
// const Vehicle = require("../models/Vehicle");
// const Driver = require("../models/TRdriverModel");
// const Complaint = require("../models/Complaint");
// const jwt = require("jsonwebtoken");

// let ioInstance = null;

// const realTimeEvents = {
//   init: (server) => {
//     if (ioInstance) return ioInstance;

//     ioInstance = new Server(server, {
//       cors: {
//         origin: process.env.NODE_ENV === "production"
//           ? ["https://your-production-domain.com"]
//           : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
//         methods: ["GET", "POST", "PUT", "DELETE"],
//         credentials: true,
//       },
//     });

//     ioInstance.on("connection", (socket) => {
//       console.log(`Client connected: ${socket.id} at ${new Date().toISOString()}`);

//       // Authenticate socket connection
//       const token = socket.handshake.headers.authorization?.split(" ")[1];
//       let userRole = "user"; // Default role
//       if (token) {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET);
//           userRole = decoded.role || "user";
//         } catch (err) {
//           console.error("Invalid token:", err.message);
//         }
//       }

//       socket.on("join-room", (room) => {
//         socket.join(room);
//         console.log(`Client ${socket.id} joined room: ${room}`);
//       });

//       socket.on("sendChatMessage", async (data, callback) => {
//         const { complaintId, sender, message, time } = data;
//         if (userRole !== "admin") {
//           callback({ error: "Only admins can send messages" });
//           return;
//         }
//         const complaint = await Complaint.findById(complaintId);
//         if (complaint) {
//           complaint.messages = complaint.messages || [];
//           complaint.messages.push({ sender, message, time });
//           await complaint.save();
//           ioInstance.to("complaints").emit("chatMessage", {
//             complaintId,
//             message: { sender, message, time },
//           });
//           callback({ success: true });
//         } else {
//           callback({ error: "Complaint not found" });
//         }
//       });

//       socket.on("disconnect", () => {
//         console.log(`Client disconnected: ${socket.id} at ${new Date().toISOString()}`);
//       });
//     });

//     return ioInstance;
//   },

//   sendModelUpdates: async (modelName) => {
//     if (!ioInstance) {
//       console.error("Socket.IO instance not initialized. Call init() first.");
//       return;
//     }
//     try {
//       let data;
//       switch (modelName) {
//         case "vehicles":
//           data = await Vehicle.find().populate("assignedDriver", "name phone verified");
//           break;
//         case "drivers":
//           data = await Driver.find();
//           break;
//         case "complaints":
//           data = await Complaint.find()
//             .populate("vehicleId", "registrationNumber")
//             .populate("driverId", "name phone");
//           break;
//         default:
//           return;
//       }
//       ioInstance.to(modelName).emit(`${modelName}Update`, {
//         success: true,
//         data,
//         timestamp: new Date().toISOString(),
//       });
//       console.log(`Sent ${modelName} updates to room ${modelName} at ${new Date().toISOString()}`);
//     } catch (error) {
//       console.error(`Error sending ${modelName} updates:`, error);
//       ioInstance.emit("error", { message: `Failed to update ${modelName}`, error: error.message });
//     }
//   },
// };

// module.exports = realTimeEvents;

const { Server } = require("socket.io");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/TRdriverModel");
const Complaint = require("../models/Complaint");
const jwt = require("jsonwebtoken");

let ioInstance = null;

const realTimeEvents = {
  init: (server) => {
    if (ioInstance) return ioInstance;

    ioInstance = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === "production"
          ? ["https://your-production-domain.com"]
          : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      },
    });

    ioInstance.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id} at ${new Date().toLocaleString()}`);

      // Authenticate socket connection
      const token = socket.handshake.headers.authorization?.split(" ")[1];
      let userRole = "user";
      let userName = "User";
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userRole = decoded.role || "user";
          userName = decoded.name || `User_${socket.id}`;
        } catch (err) {
          console.error("Invalid token:", err.message);
        }
      }

      socket.on("join-room", (room) => {
        socket.join(room);
        console.log(`${userName} (${userRole}) joined room: ${room}`);
      });

      socket.on("sendChatMessage", async (data, callback) => {
        const { complaintId, sender, message, time } = data;
        if (!complaintId || !message) {
          callback({ error: "Missing complaintId or message" });
          return;
        }
        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
          callback({ error: "Complaint not found" });
          return;
        }
        const effectiveSender = userRole === "admin" ? "Support" : sender || userName;
        complaint.messages = complaint.messages || [];
        complaint.messages.push({ sender: effectiveSender, message, time });
        await complaint.save();
        ioInstance.to("complaints").emit("chatMessage", {
          complaintId,
          message: { sender: effectiveSender, message, time },
        });
        callback({ success: true });
      });

      socket.on("disconnect", () => {
        console.log(`${userName} (${userRole}) disconnected: ${socket.id}`);
      });
    });

    return ioInstance;
  },

  sendModelUpdates: async (modelName) => {
    if (!ioInstance) {
      console.error("Socket.IO instance not initialized. Call init() first.");
      return;
    }
    try {
      let data;
      switch (modelName) {
        case "vehicles":
          data = await Vehicle.find().populate("assignedDriver", "name phone verified");
          break;
        case "drivers":
          data = await Driver.find();
          break;
        case "complaints":
          data = await Complaint.find()
            .populate("vehicleId", "registrationNumber")
            .populate("driverId", "name phone");
          break;
        default:
          return;
      }
      ioInstance.to(modelName).emit(`${modelName}Update`, {
        success: true,
        data,
        timestamp: new Date().toLocaleString(),
      });
      console.log(`Sent ${modelName} updates to room ${modelName}`);
    } catch (error) {
      console.error(`Error sending ${modelName} updates:`, error);
      ioInstance.emit("error", { message: `Failed to update ${modelName}`, error: error.message });
    }
  },
};

module.exports = realTimeEvents;