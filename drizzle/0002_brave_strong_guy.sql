CREATE TABLE `user_services` (
	`user_id` text NOT NULL,
	`provider_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `provider_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
