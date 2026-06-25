class Player {

  constructor(
    socketId,
    name
  ) {

    this.socketId =
      socketId;

    this.name =
      name;

    this.score =
      0;

    this.hasGuessed =
      false;

    // true only for the time between joining mid-round and the next
    // round actually starting; cleared back to false in word_selected
    this.joinedMidRound =
      false;

  }

}

module.exports =
  Player;