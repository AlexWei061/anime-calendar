CREATE TABLE `anime_episode_views` (
	`user_email` text NOT NULL,
	`anime_id` text NOT NULL,
	`episode_start` integer NOT NULL,
	`episode` integer NOT NULL,
	PRIMARY KEY(`user_email`, `anime_id`, `episode_start`, `episode`)
);
