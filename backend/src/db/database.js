const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// The .db file lives next to this file, inside src/db/.
// SQLite will create this file automatically the first time the server runs
// if it doesn't already exist.
const DB_PATH = path.join(__dirname, "words.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at", DB_PATH);
  }
});

// The original hardcoded word list, used only to seed the table the very
// first time the database is created. After that first run, this array is
// never read again — every word comes from the words table from then on.
const SEED_WORDS = [
  "APPLE",
  "TIGER",
  "CAR",
  "ELEPHANT",
  "HOUSE",
  "BANANA",
  "COMPUTER",
  "MOBILE",
  "CRICKET",
  "MOUNTAIN",
  "FLOWER",
  "RIVER",
  "TRAIN",
  "PIZZA",
  "DOG",
  "ANGER",
  "HAPPY",
  "SAD",
  "SUN",
  "MOON",
  "STAR",
  "OCEAN",
  "FOREST",
  "DESERT",
  "RAINBOW",
  "GUITAR",
  "PIANO",
  "DRUMS",
  "BALLOON",
  "CUPCAKE",
];

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL UNIQUE
      )`,
      (err) => {
        if (err) return reject(err);

        // Only seed if the table is currently empty, so re-running the
        // server doesn't try to re-insert (and error on) the same words.
        db.get("SELECT COUNT(*) AS count FROM words", (err, row) => {
          if (err) return reject(err);

          if (row.count > 0) {
            console.log(`Word list already seeded (${row.count} words).`);
            return resolve();
          }

          const insert = db.prepare(
            "INSERT INTO words (text) VALUES (?)"
          );
          SEED_WORDS.forEach((word) => insert.run(word));
          insert.finalize((err) => {
            if (err) return reject(err);
            console.log(`Seeded ${SEED_WORDS.length} words into the database.`);
            resolve();
          });
        });
      }
    );
  });
}

// Returns `count` random words from the words table, e.g. for the
// drawer's word-choice list. Uses SQLite's own RANDOM() so the database
// does the picking, not JavaScript.
function getRandomWordsFromDb(count = 3) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT text FROM words ORDER BY RANDOM() LIMIT ?",
      [count],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map((row) => row.text));
      }
    );
  });
}

// Lets a host add a custom word to the shared word list (a "nice to have"
// from the original assignment spec). Not wired into any socket event yet,
// but available to call once you add that feature.
function addCustomWord(word) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO words (text) VALUES (?)",
      [word.toUpperCase().trim()],
      function (err) {
        if (err) return reject(err);
        resolve({ inserted: this.changes > 0 });
      }
    );
  });
}

module.exports = {
  db,
  initDatabase,
  getRandomWordsFromDb,
  addCustomWord,
};
