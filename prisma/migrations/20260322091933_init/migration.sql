-- CreateTable
CREATE TABLE "YouTubeProducer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "youtube_channel" TEXT,
    "youtube_channel_url" TEXT,
    "youtube_subscribers" INTEGER,
    "video_title" TEXT,
    "video_url" TEXT,
    "followers_ig" INTEGER,
    "instagram" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "highlights_placements" TEXT,
    "notes" TEXT,
    "style" TEXT,
    "source" TEXT DEFAULT 'Manual',
    "status" TEXT DEFAULT 'por contactar',
    "priority" INTEGER DEFAULT 5,
    "priority_score" INTEGER,
    "next_follow_up" TEXT,
    "last_action" TEXT,
    "que_enviar" TEXT,
    "donde_enviar" TEXT,
    "re_dms" TEXT,
    "relacion" INTEGER,
    "favorite" BOOLEAN DEFAULT false,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlacementProducer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "song" TEXT,
    "artist" TEXT,
    "instagram" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "style" TEXT,
    "source" TEXT DEFAULT 'Manual',
    "status" TEXT DEFAULT 'por contactar',
    "priority" INTEGER DEFAULT 5,
    "priority_score" INTEGER,
    "next_follow_up" TEXT,
    "last_action" TEXT,
    "que_enviar" TEXT,
    "donde_enviar" TEXT,
    "re_dms" TEXT,
    "notes" TEXT,
    "highlights_placements" TEXT,
    "followers_ig" INTEGER,
    "youtube_channel" TEXT,
    "youtube_channel_url" TEXT,
    "relacion" INTEGER,
    "favorite" BOOLEAN DEFAULT false,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DiscoveryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT,
    "producers_found" INTEGER DEFAULT 0,
    "producers_added" INTEGER DEFAULT 0,
    "duplicates_skipped" INTEGER DEFAULT 0,
    "filtered_out" INTEGER DEFAULT 0,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
