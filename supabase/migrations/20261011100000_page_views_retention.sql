-- Visit statistics are kept for at most two years, as the privacy policy says (scripts/legal-pages.mjs).
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'page_views_retention';
select cron.schedule('page_views_retention', '17 3 * * *', $$delete from public.page_views where created_at < now() - interval '2 years'$$);
