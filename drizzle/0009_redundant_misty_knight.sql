CREATE TABLE `room_mood` (
	`room_code` text NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`mood` text NOT NULL,
	PRIMARY KEY(`room_code`, `member_id`),
	FOREIGN KEY (`room_code`) REFERENCES `room`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `room` ADD `mood` text;