CREATE TABLE `title_link` (
	`user_id` text NOT NULL,
	`ref` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	PRIMARY KEY(`user_id`, `ref`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
