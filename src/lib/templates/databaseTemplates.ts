export interface ProjectTemplate {
  id: string
  name: string
  description: string
  sql: string
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Product catalog, users, orders, and order items.',
    sql: `
CREATE DATABASE ecommerce_db
  WITH OWNER = postgres
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE = template0;

CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku varchar(64) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  price numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL
);

ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id)
  REFERENCES public.users (id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE public.order_items
  ADD CONSTRAINT fk_order_items_order
  FOREIGN KEY (order_id)
  REFERENCES public.orders (id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE public.order_items
  ADD CONSTRAINT fk_order_items_product
  FOREIGN KEY (product_id)
  REFERENCES catalog.products (id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
`,
  },
  {
    id: 'blog',
    name: 'Blog CMS',
    description: 'Authors, posts, categories, and comments.',
    sql: `
CREATE DATABASE blog_db
  WITH OWNER = postgres
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE = template0;

CREATE SCHEMA IF NOT EXISTS public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  bio text
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug varchar(120) NOT NULL UNIQUE,
  title varchar(200) NOT NULL
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL,
  category_id uuid,
  title varchar(240) NOT NULL,
  slug varchar(240) NOT NULL UNIQUE,
  body text NOT NULL,
  published_at timestamptz
);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  author_name varchar(120) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts
  ADD CONSTRAINT fk_posts_author
  FOREIGN KEY (author_id)
  REFERENCES public.authors (id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE public.posts
  ADD CONSTRAINT fk_posts_category
  FOREIGN KEY (category_id)
  REFERENCES public.categories (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

ALTER TABLE public.comments
  ADD CONSTRAINT fk_comments_post
  FOREIGN KEY (post_id)
  REFERENCES public.posts (id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
`,
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Leads, accounts, opportunities, and activities.',
    sql: `
CREATE DATABASE crm_db
  WITH OWNER = postgres
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE = template0;

CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(180) NOT NULL,
  vat_number varchar(32) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales.leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid,
  email varchar(255) NOT NULL,
  full_name varchar(200),
  source varchar(80),
  status varchar(40) NOT NULL DEFAULT 'new'
);

CREATE TABLE sales.opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL,
  lead_id uuid,
  title varchar(255) NOT NULL,
  value numeric(12,2) NOT NULL,
  stage varchar(80) NOT NULL DEFAULT 'qualification'
);

CREATE TABLE sales.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid NOT NULL,
  kind varchar(50) NOT NULL,
  notes text,
  due_date date
);

ALTER TABLE sales.leads
  ADD CONSTRAINT fk_leads_account
  FOREIGN KEY (account_id)
  REFERENCES public.accounts (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

ALTER TABLE sales.opportunities
  ADD CONSTRAINT fk_opportunities_account
  FOREIGN KEY (account_id)
  REFERENCES public.accounts (id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE sales.opportunities
  ADD CONSTRAINT fk_opportunities_lead
  FOREIGN KEY (lead_id)
  REFERENCES sales.leads (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

ALTER TABLE sales.activities
  ADD CONSTRAINT fk_activities_opportunity
  FOREIGN KEY (opportunity_id)
  REFERENCES sales.opportunities (id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
`,
  },
]

export function getTemplateById(templateId: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((template) => template.id === templateId)
}

