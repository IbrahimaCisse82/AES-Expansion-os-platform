CREATE OR REPLACE FUNCTION public.notify_alert_recipients(_country_id text, _type text, _title text, _message text, _link text, _entity_type text, _entity_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid;
BEGIN
  FOR _u IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('admin','director','country_manager','analyst','raf')
      AND (ur.scope_country_id IS NULL OR _country_id IS NULL OR ur.scope_country_id = _country_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type = _type AND n.entity_id = _entity_id
          AND n.created_at > now() - interval '7 days')
  LOOP
    PERFORM public.create_notification(_u, _type, _title, _message, _link, _entity_type, _entity_id);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.notify_alert_recipients(text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_budget_overrun()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b numeric; _a numeric; _ratio numeric; _label text; _sname text;
BEGIN
  IF NEW.line_type <> 'actual' OR NEW.country_id IS NULL THEN RETURN NEW; END IF;
  SELECT
    COALESCE(SUM(CASE WHEN line_type='budget' THEN m1+m2+m3+m4+m5+m6+m7+m8+m9+m10+m11+m12 END),0),
    COALESCE(SUM(CASE WHEN line_type='actual' THEN m1+m2+m3+m4+m5+m6+m7+m8+m9+m10+m11+m12 END),0)
  INTO _b, _a FROM public.budget_lines
  WHERE scenario_id = NEW.scenario_id AND country_id = NEW.country_id;
  IF _b <= 0 THEN RETURN NEW; END IF;
  _ratio := _a / _b;
  SELECT COALESCE(name, NEW.country_id) INTO _label FROM public.countries WHERE id = NEW.country_id;
  SELECT name INTO _sname FROM public.budget_scenarios WHERE id = NEW.scenario_id;
  IF _ratio >= 1 THEN
    PERFORM public.notify_alert_recipients(NEW.country_id, 'budget_overrun', '🚨 Budget dépassé',
      COALESCE(_label,'') || ' : réalisé à ' || ROUND(_ratio*100)::text || ' % du budget (' || COALESCE(_sname,'scénario') || ')',
      '/app/bi', 'budget_country', NEW.scenario_id::text || ':' || NEW.country_id || ':100');
  ELSIF _ratio >= 0.9 THEN
    PERFORM public.notify_alert_recipients(NEW.country_id, 'budget_overrun', '⚠️ Budget bientôt atteint',
      COALESCE(_label,'') || ' : réalisé à ' || ROUND(_ratio*100)::text || ' % du budget (' || COALESCE(_sname,'scénario') || ')',
      '/app/bi', 'budget_country', NEW.scenario_id::text || ':' || NEW.country_id || ':90');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_check_budget_overrun ON public.budget_lines;
CREATE TRIGGER trg_check_budget_overrun AFTER INSERT OR UPDATE ON public.budget_lines
FOR EACH ROW EXECUTE FUNCTION public.check_budget_overrun();

CREATE OR REPLACE FUNCTION public.check_kpi_drop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prev public.kpi_history%ROWTYPE; _label text; _msgs text[] := '{}';
BEGIN
  SELECT * INTO _prev FROM public.kpi_history
  WHERE country_id = NEW.country_id AND month < NEW.month ORDER BY month DESC LIMIT 1;
  SELECT name INTO _label FROM public.countries WHERE id = NEW.country_id;
  IF FOUND AND _prev.ca > 0 AND NEW.ca < _prev.ca * 0.85 THEN
    _msgs := _msgs || ('CA en baisse de ' || ROUND((1 - NEW.ca/_prev.ca)*100)::text || ' %');
  END IF;
  IF _prev.clients IS NOT NULL AND _prev.clients > 0 AND NEW.clients < _prev.clients * 0.9 THEN
    _msgs := _msgs || ('clients en baisse de ' || ROUND((1 - NEW.clients::numeric/_prev.clients)*100)::text || ' %');
  END IF;
  IF _prev.retention IS NOT NULL AND NEW.retention < _prev.retention - 5 THEN
    _msgs := _msgs || ('rétention −' || ROUND(_prev.retention - NEW.retention)::text || ' pts');
  END IF;
  IF NEW.target_ca > 0 AND NEW.ca < NEW.target_ca * 0.8 THEN
    _msgs := _msgs || ('CA à ' || ROUND(NEW.ca/NEW.target_ca*100)::text || ' % de l''objectif');
  END IF;
  IF array_length(_msgs,1) > 0 THEN
    PERFORM public.notify_alert_recipients(NEW.country_id, 'kpi_drop', '📉 KPI en chute',
      COALESCE(_label, NEW.country_id) || ' (' || NEW.month || ') : ' || array_to_string(_msgs, ', '),
      '/app/kpis', 'kpi_history', NEW.country_id || ':' || NEW.month);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_check_kpi_drop ON public.kpi_history;
CREATE TRIGGER trg_check_kpi_drop AFTER INSERT OR UPDATE ON public.kpi_history
FOR EACH ROW EXECUTE FUNCTION public.check_kpi_drop();