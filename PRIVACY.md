# ReadmeUp: Privacy Policy

ReadmeUp collects no personal data and does not transmit any information to any server.

## What is stored locally

ReadmeUp uses `browser.storage.local` to save two types of preferences on your device:

- **Per-repo enabled/disabled state**: whether you have turned ReadmeUp off for a specific repository.
- **Per-repo collapsed state**: whether you last left the README collapsed or expanded on a specific repository.

These preferences are stored as repository path strings (e.g. `torvalds/linux`) paired with a boolean. They never leave your browser and are not shared with anyone.

## Network requests

ReadmeUp makes no network requests of its own. It only runs on pages you navigate to normally.
