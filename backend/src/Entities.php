<?php
declare(strict_types=1);

namespace ErrorsFree;

/**
 * Declarative description of every managed content type.
 *
 * The admin panel is generated from these definitions rather than written
 * four times. That is a security property as much as a brevity one: there is
 * exactly one code path that binds parameters, sanitises HTML and escapes
 * output, so it can be audited once instead of per screen.
 *
 * Field types:
 *   text      single-line, escaped on output
 *   textarea  multi-line plain text, escaped on output
 *   html      rich text, run through Security::sanitizeHtml() on save
 *   slug      url segment, normalised and uniqueness-checked
 *   select    constrained to its options
 *   date      Y-m-d or null
 *   number    integer
 *   bool      0/1
 *   image     path to an uploaded file
 */
final class Entities
{
    /** @return array<string,array<string,mixed>> */
    public static function all(): array
    {
        return [
            'posts' => [
                'label'        => 'Blog posts',
                'singular'     => 'post',
                'table'        => 'posts',
                'order'        => 'published_at DESC, id DESC',
                'list_columns' => ['title', 'status', 'published_at'],
                'fields' => [
                    'title'              => ['type' => 'text',     'label' => 'Title', 'required' => true, 'max' => 255],
                    'slug'               => ['type' => 'slug',     'label' => 'Slug',  'required' => true, 'max' => 255, 'source' => 'title'],
                    'excerpt'            => ['type' => 'textarea', 'label' => 'Excerpt', 'required' => true, 'max' => 600,
                                             'help' => 'Shown on cards and, trimmed to 155 characters, as the meta description.'],
                    'body'               => ['type' => 'html',     'label' => 'Body', 'required' => true],
                    'featured_image'     => ['type' => 'image',    'label' => 'Featured image'],
                    'featured_image_alt' => ['type' => 'text',     'label' => 'Image alt text', 'max' => 255,
                                             'help' => 'Describe the image for anyone who cannot see it. Required if an image is set.'],
                    'category_id'        => ['type' => 'select',   'label' => 'Category', 'options_from' => 'categories'],
                    'author_id'          => ['type' => 'select',   'label' => 'Author',   'options_from' => 'authors'],
                    'read_minutes'       => ['type' => 'number',   'label' => 'Read time (minutes)', 'min' => 1, 'max' => 90, 'default' => 5],
                    'status'             => ['type' => 'select',   'label' => 'Status', 'options' => ['draft' => 'Draft', 'published' => 'Published'], 'default' => 'draft'],
                    'published_at'       => ['type' => 'date',     'label' => 'Publish date'],
                ],
                'children' => [
                    'tags' => ['kind' => 'tags'],
                ],
            ],

            'case_studies' => [
                'label'        => 'Case studies',
                'singular'     => 'case study',
                'table'        => 'case_studies',
                'order'        => 'published_at DESC, id DESC',
                'list_columns' => ['title', 'sector', 'status', 'published_at'],
                'fields' => [
                    'title'              => ['type' => 'text',     'label' => 'Title', 'required' => true, 'max' => 255],
                    'slug'               => ['type' => 'slug',     'label' => 'Slug',  'required' => true, 'max' => 255, 'source' => 'title'],
                    'client'             => ['type' => 'text',     'label' => 'Client', 'max' => 180,
                                             'help' => 'Write "Confidential — sector, size" where the name cannot be used.'],
                    'sector'             => ['type' => 'text',     'label' => 'Sector', 'max' => 80],
                    'duration'           => ['type' => 'text',     'label' => 'Duration', 'max' => 60],
                    'excerpt'            => ['type' => 'textarea', 'label' => 'Excerpt', 'required' => true, 'max' => 600],
                    'challenge'          => ['type' => 'textarea', 'label' => 'The challenge', 'required' => true, 'max' => 1200],
                    'approach'           => ['type' => 'textarea', 'label' => 'Our approach', 'required' => true, 'max' => 1200],
                    'outcome'            => ['type' => 'textarea', 'label' => 'The outcome',  'required' => true, 'max' => 1200],
                    'body'               => ['type' => 'html',     'label' => 'Body', 'required' => true],
                    'featured_image'     => ['type' => 'image',    'label' => 'Featured image'],
                    'featured_image_alt' => ['type' => 'text',     'label' => 'Image alt text', 'max' => 255],
                    'read_minutes'       => ['type' => 'number',   'label' => 'Read time (minutes)', 'min' => 1, 'max' => 90, 'default' => 5],
                    'status'             => ['type' => 'select',   'label' => 'Status', 'options' => ['draft' => 'Draft', 'published' => 'Published'], 'default' => 'draft'],
                    'published_at'       => ['type' => 'date',     'label' => 'Publish date'],
                ],
                'children' => [
                    'results'  => ['kind' => 'pairs', 'table' => 'case_study_results', 'fk' => 'case_study_id',
                                   'columns' => ['label', 'value'], 'label' => 'Results'],
                    'services' => ['kind' => 'list',  'table' => 'case_study_services', 'fk' => 'case_study_id',
                                   'column' => 'service_name', 'label' => 'Services used'],
                ],
            ],

            'apps' => [
                'label'        => 'Vibe-coded apps',
                'singular'     => 'app',
                'table'        => 'apps',
                'order'        => 'sort_order ASC, id DESC',
                'list_columns' => ['title', 'sector', 'status', 'featured'],
                'fields' => [
                    'title'              => ['type' => 'text',     'label' => 'Title', 'required' => true, 'max' => 160],
                    'slug'               => ['type' => 'slug',     'label' => 'Slug',  'required' => true, 'max' => 160, 'source' => 'title'],
                    'client'             => ['type' => 'text',     'label' => 'Client', 'max' => 180],
                    'sector'             => ['type' => 'text',     'label' => 'Sector', 'max' => 80],
                    'year'               => ['type' => 'text',     'label' => 'Year', 'max' => 10],
                    'summary'            => ['type' => 'textarea', 'label' => 'Summary', 'required' => true, 'max' => 900],
                    'product_url'        => ['type' => 'text',     'label' => 'Product URL', 'max' => 255],
                    'featured_image'     => ['type' => 'image',    'label' => 'Cover image'],
                    'featured_image_alt' => ['type' => 'text',     'label' => 'Image alt text', 'max' => 255],
                    'featured'           => ['type' => 'bool',     'label' => 'Feature on the home page'],
                    'sort_order'         => ['type' => 'number',   'label' => 'Sort order', 'min' => 0, 'max' => 999, 'default' => 0],
                    'status'             => ['type' => 'select',   'label' => 'Status', 'options' => ['draft' => 'Draft', 'published' => 'Published'], 'default' => 'published'],
                ],
                'children' => [
                    'results'  => ['kind' => 'pairs', 'table' => 'app_items', 'fk' => 'app_id',
                                   'columns' => ['label', 'value'], 'label' => 'Results', 'discriminator' => ['kind' => 'result']],
                    'services' => ['kind' => 'list',  'table' => 'app_items', 'fk' => 'app_id',
                                   'column' => 'label', 'label' => 'Services used', 'discriminator' => ['kind' => 'service']],
                ],
            ],

            'services' => [
                'label'        => 'Services',
                'singular'     => 'service',
                'table'        => 'services',
                'order'        => 'sort_order ASC, id ASC',
                'list_columns' => ['title', 'status', 'sort_order'],
                'fields' => [
                    'title'      => ['type' => 'text',     'label' => 'Title', 'required' => true, 'max' => 160],
                    'slug'       => ['type' => 'slug',     'label' => 'Slug',  'required' => true, 'max' => 160, 'source' => 'title'],
                    'short'      => ['type' => 'text',     'label' => 'Short name', 'max' => 120, 'help' => 'Used in navigation and tight card layouts.'],
                    'excerpt'    => ['type' => 'textarea', 'label' => 'Excerpt', 'required' => true, 'max' => 400],
                    'intro'      => ['type' => 'textarea', 'label' => 'Intro paragraph', 'required' => true, 'max' => 1200],
                    'icon'       => ['type' => 'select',   'label' => 'Icon',
                                     'options' => ['app' => 'App', 'ai' => 'AI', 'saas' => 'SaaS', 'consult' => 'Consultancy'], 'default' => 'app'],
                    'sort_order' => ['type' => 'number',   'label' => 'Sort order', 'min' => 0, 'max' => 999, 'default' => 0],
                    'status'     => ['type' => 'select',   'label' => 'Status', 'options' => ['draft' => 'Draft', 'published' => 'Published'], 'default' => 'published'],
                ],
                'children' => [
                    'deliverables' => ['kind' => 'list',  'table' => 'service_items', 'fk' => 'service_id',
                                       'column' => 'label', 'label' => 'Deliverables', 'discriminator' => ['kind' => 'deliverable']],
                    'features'     => ['kind' => 'pairs', 'table' => 'service_items', 'fk' => 'service_id',
                                       'columns' => ['label', 'body'], 'label' => 'Features', 'discriminator' => ['kind' => 'feature']],
                    'process'      => ['kind' => 'pairs', 'table' => 'service_items', 'fk' => 'service_id',
                                       'columns' => ['label', 'body'], 'label' => 'Process steps', 'discriminator' => ['kind' => 'process']],
                    'engagement'   => ['kind' => 'pairs', 'table' => 'service_items', 'fk' => 'service_id',
                                       'columns' => ['label', 'body'], 'label' => 'Engagement facts', 'discriminator' => ['kind' => 'engagement']],
                    'stack'        => ['kind' => 'list',  'table' => 'service_items', 'fk' => 'service_id',
                                       'column' => 'label', 'label' => 'Stack', 'discriminator' => ['kind' => 'stack']],
                ],
            ],
        ];
    }

    /** @return array<string,mixed>|null */
    public static function get(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }

    /** Entity keys, used to validate routing input against an allowlist. */
    public static function keys(): array
    {
        return array_keys(self::all());
    }
}
