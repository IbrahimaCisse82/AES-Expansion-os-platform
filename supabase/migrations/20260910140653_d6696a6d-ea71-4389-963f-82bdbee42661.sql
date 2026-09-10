SELECT cron.schedule('bi-report-scheduler-hourly','0 * * * *',$$
  SELECT extensions.http_post(
    url := 'https://ywwyjenswccqopisidnb.supabase.co/functions/v1/bi-report-scheduler',
    headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3d3lqZW5zd2NjcW9waXNpZG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjgxMjgsImV4cCI6MjA5MzUwNDEyOH0.GgskRteCnBA3Q2HqbnEFMjWdgRgrImaROBvXtu17KQ4'),
    body := '{}'::text,
    timeout_milliseconds := 30000
  );
$$);