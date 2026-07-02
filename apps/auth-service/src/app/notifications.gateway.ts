import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');
  // Lưu trữ map giữa userId và danh sách socketId
  private userSockets: Map<number, string[]> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      const uid = Number(userId);
      const existing = this.userSockets.get(uid) || [];
      this.userSockets.set(uid, [...existing, client.id]);
      this.logger.log(`Client connected: ${client.id} (User: ${uid})`);
    }
  }

  handleDisconnect(client: Socket) {
    this.userSockets.forEach((ids, uid) => {
      const filtered = ids.filter(id => id !== client.id);
      if (filtered.length === 0) {
        this.userSockets.delete(uid);
      } else {
        this.userSockets.set(uid, filtered);
      }
    });
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendToUser(userId: number, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(id => {
        this.server.to(id).emit(event, data);
      });
      this.logger.log(`Sent real-time notification to User ${userId}`);
    }
  }
}
