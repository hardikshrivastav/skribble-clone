const Room = require("./Room");

class GameManager {
  constructor() {
    this.rooms = {};
  }

  generateRoomCode() {
    return Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  }

  createRoom(hostSocketId) {
    const roomId = this.generateRoomCode();

    const room = new Room(
      roomId,
      hostSocketId
    );

    this.rooms[roomId] = room;

    return room;
  }

  getRoom(roomId) {
    return this.rooms[roomId];
  }

  deleteRoom(roomId) {
    delete this.rooms[roomId];
  }
}

module.exports = GameManager;