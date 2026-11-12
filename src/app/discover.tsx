import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useLanguage } from '@/i18n/language';

export default function DiscoverScreen() {
  const { t } = useLanguage();
  return <PlaceholderScreen title={t('discoverTitle')} description={t('discoverDescription')} step="6" />;
}
