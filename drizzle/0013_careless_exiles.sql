CREATE TABLE `list` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `list_by_user` ON `list` (`user_id`);--> statement-breakpoint
CREATE TABLE `list_item` (
	`list_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`added_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`list_id`, `media_type`, `tmdb_id`),
	FOREIGN KEY (`list_id`) REFERENCES `list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `room` ADD `list_id` text;