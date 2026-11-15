PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_watched` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`season` integer DEFAULT 0 NOT NULL,
	`episode` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`minutes` integer DEFAULT 0 NOT NULL,
	`watched_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_watched`("id", "user_id", "media_type", "tmdb_id", "season", "episode", "title", "poster_path", "minutes", "watched_at") SELECT "id", "user_id", "media_type", "tmdb_id", "season", "episode", "title", "poster_path", "minutes", "watched_at" FROM `watched`;--> statement-breakpoint
DROP TABLE `watched`;--> statement-breakpoint
ALTER TABLE `__new_watched` RENAME TO `watched`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `watched_once` ON `watched` (`user_id`,`media_type`,`tmdb_id`,`season`,`episode`);--> statement-breakpoint
CREATE INDEX `watched_by_time` ON `watched` (`user_id`,`watched_at`);