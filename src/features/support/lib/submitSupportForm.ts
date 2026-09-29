import {
  SUPPORT_FORM_ENTRIES,
  SUPPORT_FORM_URL,
  type SupportFormValues
} from '../model/types';

export function submitSupportForm(values: SupportFormValues): void {
  const tempForm = document.createElement('form');
  tempForm.action = SUPPORT_FORM_URL;
  tempForm.method = 'POST';
  tempForm.target = 'hidden_iframe';
  tempForm.style.display = 'none';

  const entries: Record<string, string> = {
    [SUPPORT_FORM_ENTRIES.name]: values.name.trim(),
    [SUPPORT_FORM_ENTRIES.email]: values.email.trim(),
    [SUPPORT_FORM_ENTRIES.platform]: values.platform,
    [SUPPORT_FORM_ENTRIES.topic]: values.topic,
    [SUPPORT_FORM_ENTRIES.message]: values.message.trim()
  };

  for (const [name, value] of Object.entries(entries)) {
    const input = document.createElement('input');
    input.name = name;
    input.value = value;
    tempForm.appendChild(input);
  }

  document.body.appendChild(tempForm);
  tempForm.submit();
  document.body.removeChild(tempForm);
}
