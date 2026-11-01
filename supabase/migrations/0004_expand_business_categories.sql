-- ==============================================================================
-- PaperSite: Business Category Expansion Migration
-- File: 0004_expand_business_categories.sql
-- Description: Expands projects.business_type constraint to be extensible for
-- all current categories (Gym, Cafe, Salon, Retail, Portfolio, Healthcare,
-- Education) and custom user categories.
-- ==============================================================================

alter table public.projects
  drop constraint if exists projects_business_type_check;

alter table public.projects
  add constraint projects_business_type_check
  check (length(trim(business_type)) > 0);
