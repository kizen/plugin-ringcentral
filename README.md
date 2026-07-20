# Kizen RingCentral Plugin

Kizen's RingCentral integration to make and receive calls from inside Kizen, with
automatic caller lookup and call logging. Built on
[RingCentral Embeddable](https://apps.ringcentral.com/integration/ringcentral-embeddable/).

For general plugin documentation, see https://developer.kizen.com.

## What it does

- **Dial from any phone field** - adds a "Dial with RingCentral" button
  (`src/dataAdornments/dial`) to phone-number fields that opens the dialer and
  places the call.
- **Embedded softphone** - a floating RingCentral Dialer frame
  (`src/floatingFrames/dialer`) for making and receiving calls without leaving
  Kizen.
- **Caller lookup** - on incoming and active calls, matches the phone number
  against Kizen records and surfaces the matched contact(s).
- **Create contact from a call** - prompts to create a new contact, prefilled
  with the call's phone number, when no match is found.
- **Call logging** - writes completed calls (including the recording, when
  available) to a Kizen custom object, and keeps existing logs in sync.

## Configuration

Install-time config is defined in `kizen.json` under `config_template`:

- **`callSummaryObject`** - the custom object that call logs are written to.
  - `objectId` - the target custom object's ID (resolved by name `phone_call`
    at runtime if left blank).
  - `objectFieldTemplate` - maps object fields to call values via `{{...}}`
    tokens (e.g. `{{phoneNumber}}`, `{{duration}}`, `{{direction}}`,
    `{{sessionId}}`, `{{callRecording}}`, `{{entityIds}}`, `{{currentUser}}`).
- **`callerLookupEndpoint`** - the Kizen endpoint used to search for records by
  phone number (defaults to `/client/v2`).

## License

Licensed under the GNU General Public License v2 - see [LICENSE.md](LICENSE.md).
Forks and derivative plugins must also be open-sourced under the same license.
