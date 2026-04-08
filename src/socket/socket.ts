import { Server, Socket } from "socket.io";
// Adjust these import paths based on exactly where your socket.ts file is located
import { userFindById } from "../services/user.service.ts";
import { verifyToken } from "../utills/token.utill.ts";

// 1. Extend the Socket interface so TypeScript knows about 'socket.user'
export interface AuthenticatedSocket extends Socket {
  user?: any; // Tip: Replace 'any' with your actual User database type/interface
}

export const setupSocket = async (io: Server) => {
  // 2. Add the async authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // In WebSockets, it's best practice to send the token in the 'auth' payload,
      // rather than headers (though headers are possible).
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Unauthorized: No token provided"));
      }

      // Re-use your existing token utility
      const result = verifyToken(token);

      if (!result || !result.id) {
        return next(new Error("Unauthorized: Invalid token"));
      }

      // Re-use your existing database service
      const user = await userFindById(Number(result.id));

      if (!user) {
        return next(new Error("Unauthorized: User not found"));
      }

      // Attach the verified database user to the socket object
      socket.user = user;

      // Let the connection proceed!
      next();
    } catch (error) {
      console.error("Socket Authentication Error:", error);
      return next(new Error("Unauthorized: Authentication failed"));
    }
  });

  // 3. Handle the actual connection (this only runs if next() was called above)
  io.on("connection", (socket: AuthenticatedSocket) => {
    // Exact room pattern as requested
    socket.on("join-poll", (pollId: string) => {
      socket.join(`poll:${pollId}`);
      console.log(`User ${socket.user.id} joined poll room: poll:${pollId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User ${socket.user.id} disconnected`);
    });
  });
};
