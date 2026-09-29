import { t } from '@/shared/lib/i18n';
import { LegalDocumentLayout } from '../ui/LegalDocumentLayout';

export function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <LegalDocumentLayout
      documentTitle={t('legal.privacy.documentTitle')}
      eyebrow={t('legal.eyebrow')}
      footerCurrent="privacy"
      sections={[
        {
          title: t('legal.privacy.who.title'),
          paragraphs: [t('legal.privacy.who.body')]
        },
        {
          title: t('legal.privacy.collect.title'),
          paragraphs: [
            t('legal.privacy.collect.body1'),
            t('legal.privacy.collect.body2'),
            t('legal.privacy.collect.body3')
          ]
        },
        {
          title: t('legal.privacy.use.title'),
          paragraphs: [t('legal.privacy.use.body')]
        },
        {
          title: t('legal.privacy.location.title'),
          paragraphs: [t('legal.privacy.location.body')]
        },
        {
          title: t('legal.privacy.messages.title'),
          paragraphs: [t('legal.privacy.messages.body')]
        },
        {
          title: t('legal.privacy.share.title'),
          paragraphs: [t('legal.privacy.share.body')]
        },
        {
          title: t('legal.privacy.retention.title'),
          paragraphs: [t('legal.privacy.retention.body')]
        },
        {
          title: t('legal.privacy.rights.title'),
          paragraphs: [t('legal.privacy.rights.body')]
        },
        {
          title: t('legal.privacy.children.title'),
          paragraphs: [t('legal.privacy.children.body')]
        },
        {
          title: t('legal.privacy.changes.title'),
          paragraphs: [t('legal.privacy.changes.body')]
        },
        {
          title: t('legal.privacy.contact.title'),
          paragraphs: [t('legal.privacy.contact.body')]
        }
      ]}
      title={t('legal.privacy.title')}
      updated={t('legal.privacy.updated')}
    />
  );
}
