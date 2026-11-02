import assert from "node:assert/strict";
import {
  VLUE_VCARD_NOTE,
  buildLocalContactVcf,
  dccCardToContactProfile
} from "./contactVcfSave.js";

const profile = dccCardToContactProfile({
  legalName: "이종근",
  organization: "VCID KOREA",
  title: "CEO",
  phone: "010-8014-4666",
  email: "ceo@vlue.kr",
  website: "https://vlue.kr",
  fax: "050-4368-4666",
  address: "서울"
});

assert.equal(profile.name, "이종근");
assert.equal(profile.organization, "VCID KOREA");
assert.equal(profile.title, "CEO");
assert.equal(profile.email, "ceo@vlue.kr");

const vcf = buildLocalContactVcf(profile);
assert.match(vcf, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
assert.match(vcf, /FN:이종근/);
assert.match(vcf, /ORG:VCID KOREA/);
assert.match(vcf, /TITLE:CEO/);
assert.match(vcf, /TEL;TYPE=CELL:010-8014-4666/);
assert.match(vcf, /EMAIL;TYPE=INTERNET:ceo@vlue\.kr/);
assert.match(vcf, /URL:https:\/\/vlue\.kr/);
assert.match(vcf, new RegExp(`NOTE:${VLUE_VCARD_NOTE}`));
assert.match(vcf, /END:VCARD/);

const masked = dccCardToContactProfile({ name: "숨김", phone: "010-****-4666" });
assert.equal(masked.phone, "");

const placeholder = dccCardToContactProfile({
  name: "테스트",
  email: "이메일을 입력할 수 있습니다."
});
assert.equal(placeholder.email, "");

console.log("contactVcfSave.test.js OK");
