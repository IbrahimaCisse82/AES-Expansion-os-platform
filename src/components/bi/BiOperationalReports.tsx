import { ReportingHome } from '@/pages/ReportingPage';

/** Les rapports opérationnels A1–A12 vivent dans l'espace Reporting ; le BI en affiche la même vue. */
export function BiOperationalReports() {
  return <ReportingHome embedded />;
}
