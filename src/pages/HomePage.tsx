import { AppLayout } from '../components/AppLayout';
import { Spreadsheet } from '../features/spreadsheet/Spreadsheet';

export function HomePage() {
  return (
    <AppLayout>
      <Spreadsheet />
    </AppLayout>
  );
}
