import { isOwnContact } from './telegram-bot.service';

describe('isOwnContact', () => {
  const base = { message_id: 1, chat: { id: 10, type: 'private' } };

  it('accepts a contact card that belongs to the sender', () => {
    expect(isOwnContact({ ...base, from: { id: 42, first_name: 'A' }, contact: { phone_number: '+998901234567', user_id: 42, first_name: 'A' } })).toBe(true);
  });

  it('rejects a forwarded contact of another person', () => {
    expect(isOwnContact({ ...base, from: { id: 42, first_name: 'A' }, contact: { phone_number: '+998901234567', user_id: 7, first_name: 'B' } })).toBe(false);
  });

  it('rejects a contact without a Telegram user id', () => {
    expect(isOwnContact({ ...base, from: { id: 42, first_name: 'A' }, contact: { phone_number: '+998901234567', first_name: 'B' } })).toBe(false);
  });
});
