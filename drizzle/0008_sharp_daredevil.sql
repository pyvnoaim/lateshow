CREATE TABLE `room_pick` (
	`room_code` text NOT NULL,
	`member_id` text NOT NULL,
	`match` integer NOT NULL,
	`choice` integer NOT NULL,
	PRIMARY KEY(`room_code`, `member_id`, `match`),
	FOREIGN KEY (`room_code`) REFERENCES `room`(`code`) ON UPDATE no action ON DELETE cascade
);
