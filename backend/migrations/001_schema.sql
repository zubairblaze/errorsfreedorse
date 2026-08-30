-- =====================================================================
-- ErrorsFree — Phase 2 schema
--
-- Target: MySQL 5.7+ / MariaDB 10.3+ (XAMPP and cPanel both qualify).
-- Charset utf8mb4 throughout: the site is bilingual and utf8mb3 cannot
-- store the full Arabic range or emoji.
--
-- Apply:  mysql -u errdorste -p errdorste < migrations/001_schema.sql
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ---------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------

-- Passwords are stored only as a password_hash() digest. Nothing in this
-- repository, this file included, ever contains a plaintext password.
CREATE TABLE IF NOT EXISTS admins (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username            VARCHAR(64)  NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  -- Bumping this invalidates every existing session for the account,
  -- which is what makes a password change actually log other devices out.
  session_epoch       INT UNSIGNED NOT NULL DEFAULT 1,
  must_change_password TINYINT(1)  NOT NULL DEFAULT 0,
  last_login_at       DATETIME     NULL,
  last_login_ip       VARBINARY(16) NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every attempt, successful or not. Throttling reads this; it is also the
-- only audit trail of who tried to get in.
CREATE TABLE IF NOT EXISTS login_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username     VARCHAR(64)   NOT NULL,
  ip           VARBINARY(16) NOT NULL,
  success      TINYINT(1)    NOT NULL DEFAULT 0,
  attempted_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attempts_ip_time (ip, attempted_at),
  KEY idx_attempts_user_time (username, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS authors (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  role       VARCHAR(120) NOT NULL DEFAULT '',
  avatar     VARCHAR(255) NULL,
  bio        TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title              VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL,
  excerpt            TEXT         NOT NULL,
  body               LONGTEXT     NOT NULL,
  featured_image     VARCHAR(255) NULL,
  featured_image_alt VARCHAR(255) NOT NULL DEFAULT '',
  author_id          INT UNSIGNED NULL,
  category_id        INT UNSIGNED NULL,
  status             ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at       DATE         NULL,
  read_minutes       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_posts_slug (slug),
  -- The index the public listing actually uses.
  KEY idx_posts_live (status, published_at),
  KEY idx_posts_category (category_id),
  CONSTRAINT fk_posts_author   FOREIGN KEY (author_id)   REFERENCES authors(id)    ON DELETE SET NULL,
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT UNSIGNED NOT NULL,
  tag_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  KEY idx_post_tags_tag (tag_id),
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Case studies
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_studies (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title              VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL,
  client             VARCHAR(180) NOT NULL DEFAULT '',
  sector             VARCHAR(80)  NOT NULL DEFAULT '',
  excerpt            TEXT         NOT NULL,
  body               LONGTEXT     NOT NULL,
  featured_image     VARCHAR(255) NULL,
  featured_image_alt VARCHAR(255) NOT NULL DEFAULT '',
  challenge          TEXT         NOT NULL,
  approach           TEXT         NOT NULL,
  outcome            TEXT         NOT NULL,
  duration           VARCHAR(60)  NOT NULL DEFAULT '',
  status             ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at       DATE         NULL,
  read_minutes       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_case_studies_slug (slug),
  KEY idx_case_live (status, published_at),
  KEY idx_case_sector (sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_results (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_study_id INT UNSIGNED NOT NULL,
  label         VARCHAR(120) NOT NULL,
  value         VARCHAR(120) NOT NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_case_results (case_study_id, sort_order),
  CONSTRAINT fk_case_results FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_services (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_study_id INT UNSIGNED NOT NULL,
  service_name  VARCHAR(120) NOT NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_case_services (case_study_id, sort_order),
  CONSTRAINT fk_case_services FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS services (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(160) NOT NULL,
  slug       VARCHAR(160) NOT NULL,
  short      VARCHAR(120) NOT NULL DEFAULT '',
  excerpt    TEXT         NOT NULL,
  intro      TEXT         NOT NULL,
  icon       VARCHAR(40)  NOT NULL DEFAULT 'app',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status     ENUM('draft','published') NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_slug (slug),
  KEY idx_services_live (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One table for every ordered list hanging off a service. `kind`
-- distinguishes them, which keeps four near-identical tables from existing.
CREATE TABLE IF NOT EXISTS service_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id INT UNSIGNED NOT NULL,
  kind       ENUM('deliverable','feature','process','engagement','stack') NOT NULL,
  label      VARCHAR(255) NOT NULL DEFAULT '',
  body       TEXT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_service_items (service_id, kind, sort_order),
  CONSTRAINT fk_service_items FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Vibe-coded apps (our own products)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS apps (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title              VARCHAR(160) NOT NULL,
  slug               VARCHAR(160) NOT NULL,
  client             VARCHAR(180) NOT NULL DEFAULT '',
  sector             VARCHAR(80)  NOT NULL DEFAULT '',
  summary            TEXT         NOT NULL,
  year               VARCHAR(10)  NOT NULL DEFAULT '',
  product_url        VARCHAR(255) NULL,
  featured_image     VARCHAR(255) NULL,
  featured_image_alt VARCHAR(255) NOT NULL DEFAULT '',
  featured           TINYINT(1)   NOT NULL DEFAULT 0,
  status             ENUM('draft','published') NOT NULL DEFAULT 'published',
  sort_order         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_apps_slug (slug),
  KEY idx_apps_live (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  app_id     INT UNSIGNED NOT NULL,
  kind       ENUM('result','service') NOT NULL,
  label      VARCHAR(160) NOT NULL DEFAULT '',
  value      VARCHAR(160) NOT NULL DEFAULT '',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_app_items (app_id, kind, sort_order),
  CONSTRAINT fk_app_items FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Inbound
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(160) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  company    VARCHAR(180) NOT NULL DEFAULT '',
  service    VARCHAR(120) NOT NULL DEFAULT '',
  budget     VARCHAR(60)  NOT NULL DEFAULT '',
  message    TEXT         NOT NULL,
  ip         VARBINARY(16) NULL,
  handled    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscribers (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  ip         VARBINARY(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscribers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
