-- RUN STATS' database (D1). One row a life; `report` is the whole JSON js/stats.js sent.
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  player TEXT NOT NULL,
  build TEXT NOT NULL,
  at INTEGER NOT NULL,        -- when the life began (the player's clock)
  got INTEGER NOT NULL,       -- when it arrived (ours)
  end_how TEXT,
  end_floor TEXT,
  killer TEXT,
  flags TEXT,
  release INTEGER,
  report TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_got ON reports (got);
CREATE INDEX IF NOT EXISTS reports_build ON reports (build, got);

-- The rate limit: a salted hash of the sender's address and when, kept a day.
CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS hits_ip ON hits (ip, at);

-- The funnel (js/stats.js `step`): the first time a player took each step, kept once.
CREATE TABLE IF NOT EXISTS steps (
  player TEXT NOT NULL,
  step TEXT NOT NULL,         -- open, start, death, restart, clear1, reach4, reach8, win
  at INTEGER NOT NULL,        -- when he took it (the player's clock)
  build TEXT,
  release INTEGER,
  got INTEGER NOT NULL,       -- when it arrived (ours)
  PRIMARY KEY (player, step)
);
CREATE INDEX IF NOT EXISTS steps_got ON steps (got);
