CREATE TABLE `anime_selections` (
	`user_email` text NOT NULL,
	`anime_id` text NOT NULL,
	PRIMARY KEY(`user_email`, `anime_id`)
);
