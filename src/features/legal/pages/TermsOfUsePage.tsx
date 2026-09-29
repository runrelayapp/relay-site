import { t } from '@/shared/lib/i18n';
import { LegalDocumentLayout } from '../ui/LegalDocumentLayout';

export function TermsOfUsePage(): React.JSX.Element {
  return (
    <LegalDocumentLayout
      documentTitle={t('legal.terms.documentTitle')}
      eyebrow={t('legal.eyebrow')}
      footerCurrent="terms"
      sections={[
        {
          title: t('legal.terms.agreement.title'),
          paragraphs: [t('legal.terms.agreement.body')]
        },
        {
          title: t('legal.terms.service.title'),
          paragraphs: [t('legal.terms.service.body')]
        },
        {
          title: t('legal.terms.accounts.title'),
          paragraphs: [t('legal.terms.accounts.body')]
        },
        {
          title: t('legal.terms.content.title'),
          paragraphs: [t('legal.terms.content.body')]
        },
        {
          title: t('legal.terms.conduct.title'),
          paragraphs: [t('legal.terms.conduct.body')]
        },
        {
          title: t('legal.terms.location.title'),
          paragraphs: [t('legal.terms.location.body')]
        },
        {
          title: t('legal.terms.ip.title'),
          paragraphs: [t('legal.terms.ip.body')]
        },
        {
          title: t('legal.terms.disclaimer.title'),
          paragraphs: [t('legal.terms.disclaimer.body')]
        },
        {
          title: t('legal.terms.liability.title'),
          paragraphs: [t('legal.terms.liability.body')]
        },
        {
          title: t('legal.terms.termination.title'),
          paragraphs: [t('legal.terms.termination.body')]
        },
        {
          title: t('legal.terms.changes.title'),
          paragraphs: [t('legal.terms.changes.body')]
        },
        {
          title: t('legal.terms.contact.title'),
          paragraphs: [t('legal.terms.contact.body')]
        }
      ]}
      title={t('legal.terms.title')}
      updated={t('legal.terms.updated')}
    />
  );
}
