const messages = {
  'landing.meta.title': 'Relay — Voices from the sidelines, mile by mile',
  'landing.badge': 'Coming soon',
  'landing.headline.lead': 'Voices from the sidelines,',
  'landing.headline.em': 'mile by mile.',
  'landing.body.before': 'Relay is a warm running companion — ',
  'landing.body.emphasis': 'a handwritten note, not a heart-rate chart.',
  'landing.feature.voice': 'Voice memos',
  'landing.feature.song': 'Song dedications',
  'landing.feature.text': 'Text messages',
  'landing.feature.mile': 'Mile marker delivery',
  'landing.feature.memories': 'Race memories',
  'landing.quote.from': 'At mile 18 · from your daughter',
  'landing.quote.text': '"Go get it mama, you are the fastest."',
  'landing.quote.meta': 'Voice · 0:12 · delivered automatically',
  'landing.notify.label': 'Be the first to know when Relay launches →',
  'landing.notify.placeholder': 'your@email.com',
  'landing.notify.cta': 'Notify me',
  'landing.notify.success': "You're on the list. We'll be in touch. 💙",
  'landing.instagram': 'Follow us @run.relay',
  'landing.footer': 'relay · a warmer way to run · iOS & Android · coming soon',

  'race.loading': 'Checking your link…',
  'race.unavailable.eyebrow': 'Link problem',
  'race.unavailable.missingTitle': "This race doesn't exist",
  'race.unavailable.missingBody':
    "We couldn't find a race for this link. Ask the runner to send you a fresh invite.",
  'race.unavailable.finishedTitle': 'This race has finished',
  'race.unavailable.finishedBody':
    "Race day is over, so this link can't take new messages. Say hi to the runner directly—they'll love hearing from you.",
  'race.unavailable.formTitle': 'Form unavailable',
  'race.unavailable.formBody':
    'Relay is not connected yet. Try again later or contact the runner.',
  'race.unavailable.permissionTitle': 'Form unavailable',
  'race.unavailable.permissionBody':
    'This link could not be verified. Firestore rules may need to be deployed (allow get on races for the web form).',
  'race.unavailable.connectionTitle': 'Connection problem',
  'race.unavailable.connectionBody':
    'Could not reach Relay. Check your network and refresh the page.',
  'race.greeting.eyebrow': "You're sending love to",
  'race.greeting.lede.mile':
    "They'll hear (or read) whatever you send at the mile you pick. It'll land like a postcard from you, right when they need it most.",
  'race.greeting.lede.time':
    "They'll hear (or read) whatever you send at the moment you pick. It'll land like a postcard from you, right when they need it most.",
  'race.format.label': 'Choose a format',
  'race.format.voice': 'Voice',
  'race.format.text': 'Text',
  'race.format.song': 'Song',
  'race.format.tabsAria': 'Message format',
  'race.voice.limitHint': 'Up to {seconds} seconds',
  'race.voice.record': 'Record audio',
  'race.voice.stop': 'Stop',
  'race.voice.yourRecording': 'Your recording',
  'race.voice.playAria': 'Play recording',
  'race.voice.redo': 'Record again',
  'race.voice.micRequired': 'Microphone access is required to record a voice message.',
  'race.voice.playFailed': 'Could not play recording. Tap play again.',
  'race.voice.needRecording': 'Record a voice message first.',
  'race.text.label': 'Your message',
  'race.text.placeholder': 'Write a message for the mile you pick…',
  'race.text.needMessage': 'Write a message first.',
  'race.song.searchBrand': 'Search Apple Music',
  'race.song.via': 'Via Apple Music',
  'race.song.searchPlaceholder': 'Search Apple Music…',
  'race.song.resultsAria': 'Search results',
  'race.song.previewAttached': '30-sec preview attached',
  'race.song.previewMissing': 'Track selected · no preview available for this song',
  'race.song.previewPlayAria': 'Play 30-second preview',
  'race.song.needTrack': 'Select a song from the list.',
  'race.song.needPreview': 'Pick a song that includes a 30-second preview.',
  'race.song.noPreview': 'No preview available for this track.',
  'race.song.previewFailed': 'Could not play preview. Tap play again on mobile.',
  'race.deliver.label': 'Deliver at',
  'race.deliver.startMile': 'Start · 0',
  'race.submit': 'Send with love',
  'race.submit.sending': 'Sending…',
  'race.submit.lockDismiss': 'Back to form',
  'race.footer.base': 'No login. Free.',
  'race.footer.mile': 'No login. Free. Your voice, straight to them at mile {mile}.',
  'race.footer.time': 'No login. Free. Your voice, straight to them at {time}.',
  'race.brandAria': 'relay',
  'race.defaultRunner': 'Runner',
  'race.defaultRace': 'Race',

  'sent.eyebrow': 'On its way',
  'sent.headline': 'Sent with love',
  'sent.lede':
    "Your postcard is queued. It'll reach the runner at the mile you chose — right when it matters.",

  'reset.status.idle': 'Relay email action handler.',
  'reset.status.missing':
    'Relay email action handler. Open the link from your Relay email to continue.',
  'reset.status.opening': 'Opening Relay… If nothing happens, tap Open Relay below.',
  'reset.status.desktop':
    'Open Relay on your phone to choose a new password, or use the reset link from the Relay app.',
  'reset.status.other': 'Open Relay on your device to finish this email action.',
  'reset.openApp': 'Open Relay',

  'error.storage.noBucket':
    'Voice upload is not configured (missing storage bucket in config.js).',
  'error.storage.bucket':
    'Voice upload failed. Enable Firebase Storage in the console, deploy storage rules, and apply bucket CORS (see firebase/storage.cors.json).',
  'error.storage.unauthorized':
    'Voice upload was rejected. Enable Firebase Storage and deploy storage rules.',
  'error.storage.canceled': 'Upload was canceled. Try again.',
  'error.storage.quota': 'Storage quota exceeded. Try again later or use text.',
  'error.storage.retry':
    'Voice upload failed. Turn on Firebase Storage in the console, deploy storage rules, and set bucket CORS for this site.',
  'error.storage.generic': 'Voice upload failed. Firebase Storage may be unavailable.',
  'error.permission': 'Could not send. Firestore rules rejected this message.',
  'error.network': 'Network error. Check your connection and try again.',
  'error.precondition': 'Could not send. Firebase may not be fully set up for this project.',
  'error.cors':
    'Voice upload blocked by the network or Storage setup. Enable Storage and bucket CORS, then try again.',
  'error.generic': 'Could not send. Try again.',
  'error.searchFailed': 'Search failed',
  'error.appleSearchFailed': 'Apple Music search failed',
  'error.appleSearchTimeout': 'Apple Music search timed out'
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let value: string = messages[key];
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}
