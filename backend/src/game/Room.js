class Room {
  constructor(roomId, hostId) {
    this.roomId = roomId;
    this.hostId = hostId;

    this.players = [];
    this.currentWord = "";
    this.round = 1;
    this.maxRounds = 3;
    this.timer = 60;
    this.gameStarted = false;

    this.currentDrawerIndex = 0;
  }

  addPlayer(player) {
    // If a player joins while a round is already in progress (a word has
    // been chosen and the timer is running), mark them so the server knows
    // not to let them score on a round they didn't see the start of, and so
    // the frontend knows to show them a "waiting for next round" state
    // instead of a half-correct guessing UI.
    if (this.gameStarted && this.currentWord) {
      player.joinedMidRound = true;
      player.hasGuessed = true; // prevents scoring on the round already in progress
    }
    this.players.push(player);
  }

  removePlayer(socketId) {
    this.players = this.players.filter(
      (player) =>
        player.socketId !== socketId
    );
  }

  getCurrentDrawer() {
    return this.players[
      this.currentDrawerIndex
    ];
  }

  nextDrawer() {
    this.currentDrawerIndex++;
    if (this.currentDrawerIndex >=
      this.players.length
    ) {
      this.currentDrawerIndex = 0;
      this.round++;
    }
  }
}

module.exports = Room;