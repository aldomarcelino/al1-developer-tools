import type { Faker } from "@faker-js/faker";
import { validateSchema, type Field, type Locale, type MockRow } from "./schema.ts";

// Locale-specific entry points keep all other languages out of these chunks.
export async function loadFaker(locale: Locale): Promise<Faker> {
  switch (locale) {
    case "id_ID":
      return (await import("@faker-js/faker/locale/id_ID")).faker;
    case "ja":
      return (await import("@faker-js/faker/locale/ja")).faker;
    default:
      return (await import("@faker-js/faker/locale/en_US")).faker;
  }
}
function value(faker: Faker, entry: Field, index: number, now: Date) {
  switch (entry.type) {
    case "id":
      return index + 1;
    case "uuid":
      return faker.string.uuid();
    case "fullName":
      return faker.person.fullName();
    case "firstName":
      return faker.person.firstName();
    case "email":
      return faker.internet.email();
    case "phone":
      return faker.phone.number();
    case "avatar":
      return faker.image.avatar();
    case "username":
      return faker.internet.username();
    case "ipv4":
      return faker.internet.ipv4();
    case "url":
      return faker.internet.url();
    case "password":
      return faker.internet.password({ length: 16 });
    case "city":
      return faker.location.city();
    case "country":
      return faker.location.country();
    case "zipCode":
      return faker.location.zipCode();
    case "latitude":
      return faker.location.latitude();
    case "longitude":
      return faker.location.longitude();
    case "price":
      return Number(faker.commerce.price());
    case "productName":
      return faker.commerce.productName();
    case "company":
      return faker.company.name();
    case "past":
      return faker.date.past({ refDate: now }).toISOString();
    case "future":
      return faker.date.future({ refDate: now }).toISOString();
    case "recent":
      return faker.date.recent({ refDate: now }).toISOString();
    case "creditCard":
      return faker.finance.creditCardNumber();
    case "iban":
      return faker.finance.iban();
    case "boolean":
      return faker.datatype.boolean();
    case "number":
      return faker.number.int({ min: entry.min, max: entry.max });
    case "sentence":
      return faker.lorem.sentence();
    case "paragraph":
      return faker.lorem.paragraph();
  }
}
export async function generateRows(
  fields: Field[],
  rows: number,
  locale: Locale,
  signal?: AbortSignal
): Promise<MockRow[]> {
  validateSchema(fields, rows);
  const faker = await loadFaker(locale);
  const result: MockRow[] = [];
  const now = new Date();
  for (let i = 0; i < rows; i++) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    result.push(
      Object.fromEntries(
        fields.map((entry) => [
          entry.name,
          entry.nullPercent === 100 ||
          (entry.nullPercent > 0 &&
            faker.number.float({ min: 0, max: 100 }) < entry.nullPercent)
            ? null
            : value(faker, entry, i, now),
        ])
      )
    );
    // Give edits and cancellation a chance to run during larger generations.
    if (i % 100 === 99) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return result;
}
