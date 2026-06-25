const { getRandomWordsFromDb } = require("../db/database");

// NOTE: this function is now ASYNC because it queries SQLite instead of
// shuffling an in-memory array. Every place that calls getRandomWords()
// must now use `await getRandomWords()` instead of calling it directly.
// See server.js for the updated call sites.
async function getRandomWords() {
  return await getRandomWordsFromDb(3);
}

module.exports = getRandomWords;
