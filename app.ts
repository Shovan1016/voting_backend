import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http"; // 1. Import createServer
import { Server } from "socket.io";  // 2. Import Socket.io Server

// import helmet from "helmet";
import { userRouter } from "./src/routes/user.routes.ts";
import { pollsRouter } from "./src/routes/polls.routes.ts";
import { errorHandler } from "./src/middlewares/errorHandler.ts";
import { authMiddleware } from "./src/middlewares/auth.middleware.ts";
import { optionsRouter } from "./src/routes/options.routes.ts";

// 3. Import your new socket setup function
import { setupSocket } from "./src/socket/socket.ts"; 

dotenv.config();

const app = express();

// 4. Wrap app in HTTP server and initialize Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust this to your frontend URL later
    methods: ["GET", "POST"]
  }
});

// Expose 'io' to the express routes
app.set("io", io);

app.use(cors());
// app.use(helmet());
app.use(express.json());

app.use(authMiddleware);

app.use("/users", userRouter);
app.use("/polls", pollsRouter);
app.use("/options", optionsRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Setup your socket connections
setupSocket(io);

// Error handler MUST be the last middleware!
app.use(errorHandler);

// 5. Listen on httpServer, NOT app
httpServer.listen(process.env.APP_PORT, () => {
  console.log(`Server is running on port ${process.env.APP_PORT}`);
});

export default app;