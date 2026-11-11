CREATE TABLE `room_vote` (
	`room_code` text NOT NULL,
	`member_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`like` integer NOT NULL,
	PRIMARY KEY(`room_code`, `member_id`, `tmdb_id`),
	FOREIGN KEY (`room_code`) REFERENCES `room`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `room` ADD `country` text;--> statement-breakpoint
ALTER TABLE `room` ADD `services` text;--> statement-breakpoint
ALTER TABLE `room` ADD `deck` text;--> statement-breakpoint
ALTER TABLE `room` ADD `winner` integer;