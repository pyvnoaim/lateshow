CREATE TABLE `room` (
	`code` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`kind` text NOT NULL,
	`game` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_member` (
	`room_code` text NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`joined` integer DEFAULT true NOT NULL,
	`joined_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`room_code`, `member_id`),
	FOREIGN KEY (`room_code`) REFERENCES `room`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_member_by_member` ON `room_member` (`member_id`);